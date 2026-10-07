import { DatePipe, isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
    AfterViewInit,
    Component,
    DestroyRef,
    ElementRef,
    inject,
    OnInit,
    PLATFORM_ID,
    signal,
    ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
    Blog,
    BlogAdminService,
} from '@app/features/admin/blogs/services/blog-admin.service';
import { ButtonDirective } from '@openng/optimus-ui/button';
import { IconField } from '@openng/optimus-ui/iconfield';
import { InputIcon } from '@openng/optimus-ui/inputicon';
import { InputText } from '@openng/optimus-ui/inputtext';
import { Select } from '@openng/optimus-ui/select';
import { debounceTime, distinctUntilChanged, finalize, map } from 'rxjs';

type BlogStatusFilter = 'all' | 'published' | 'draft';

@Component({
    selector: 'app-blog-list',
    imports: [
        ButtonDirective,
        DatePipe,
        IconField,
        InputIcon,
        InputText,
        ReactiveFormsModule,
        RouterLink,
        Select,
    ],
    templateUrl: './blog-list.html',
})
export class BlogList implements OnInit, AfterViewInit {
    private readonly blogAdminService = inject(BlogAdminService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly platformId = inject(PLATFORM_ID);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly pageSize = 20;
    private observer?: IntersectionObserver;
    private requestVersion = 0;
    private sentinelVisible = false;

    @ViewChild('loadMoreSentinel') private loadMoreSentinel?: ElementRef<HTMLElement>;

    protected readonly searchControl = new FormControl('', { nonNullable: true });
    protected readonly statusControl = new FormControl<BlogStatusFilter>('all', {
        nonNullable: true,
    });
    protected readonly statusOptions: Array<{ label: string; value: BlogStatusFilter }> = [
        { label: 'All blogs', value: 'all' },
        { label: 'Published', value: 'published' },
        { label: 'Drafts', value: 'draft' },
    ];
    protected readonly blogs = signal<Blog[]>([]);
    protected readonly page = signal(0);
    protected readonly totalCount = signal(0);
    protected readonly loading = signal(false);
    protected readonly errorMessage = signal<string | null>(null);

    ngOnInit(): void {
        this.searchControl.valueChanges
            .pipe(
            map((value) => value.trim()),
            debounceTime(350),
            distinctUntilChanged(),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe(() => void this.updateUrl());

        this.statusControl.valueChanges
            .pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
            .subscribe(() => void this.updateUrl());

        this.route.queryParamMap
            .pipe(
                map((params) => ({
                    search: params.get('search')?.trim() ?? '',
                    status: this.parseStatus(params.get('status')),
                })),
                distinctUntilChanged(
                    (previous, current) =>
                        previous.search === current.search && previous.status === current.status,
                ),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe(({ search, status }) => {
                this.searchControl.setValue(search, { emitEvent: false });
                this.statusControl.setValue(status, { emitEvent: false });
                this.resetAndLoad();
            });
    }

    ngAfterViewInit(): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }

        const sentinel = this.loadMoreSentinel?.nativeElement;
        if (!sentinel) {
            return;
        }

        this.observer = new IntersectionObserver(
            ([entry]) => {
                this.sentinelVisible = entry.isIntersecting;
                if (entry.isIntersecting) {
                    this.loadNextPage();
                }
            },
            { rootMargin: '240px 0px' },
        );
        this.observer.observe(sentinel);
        this.destroyRef.onDestroy(() => this.observer?.disconnect());
    }

    protected description(blog: Blog): string {
        return blog.excerpt || blog.content;
    }

    protected hasMore(): boolean {
        return this.blogs().length < this.totalCount();
    }

    protected retry(): void {
        this.errorMessage.set(null);
        this.loadNextPage();
    }

    private updateUrl(): Promise<boolean> {
        const search = this.searchControl.value.trim();
        const status = this.statusControl.value;

        return this.router.navigate([], {
            relativeTo: this.route,
            queryParams: {
                search: search || null,
                status: status === 'all' ? null : status,
            },
            replaceUrl: true,
        });
    }

    private parseStatus(value: string | null): BlogStatusFilter {
        return value === 'published' || value === 'draft' ? value : 'all';
    }

    private resetAndLoad(): void {
        this.requestVersion++;
        this.blogs.set([]);
        this.page.set(0);
        this.totalCount.set(0);
        this.errorMessage.set(null);
        this.loading.set(false);
        this.loadNextPage();
    }

    private loadNextPage(): void {
        if (this.loading() || this.errorMessage() || (this.page() > 0 && !this.hasMore())) {
            return;
        }

        const requestedPage = this.page() + 1;
        const version = this.requestVersion;
        const status = this.statusControl.value;
        this.loading.set(true);

        this.blogAdminService
            .getBlogs({
                search: this.searchControl.value.trim() || undefined,
                isPublished: status === 'all' ? undefined : status === 'published',
                page: requestedPage,
                pageSize: this.pageSize,
            })
            .pipe(
                finalize(() => {
                    if (version !== this.requestVersion) {
                        return;
                    }

                    this.loading.set(false);
                    if (this.sentinelVisible && this.hasMore()) {
                        queueMicrotask(() => this.loadNextPage());
                    }
                }),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe({
                next: (response) => {
                    if (version !== this.requestVersion) {
                        return;
                    }

                    this.blogs.update((blogs) => [...blogs, ...response.items]);
                    this.page.set(response.page);
                    this.totalCount.set(response.totalCount);
                },
                error: (error: HttpErrorResponse) => {
                    if (version !== this.requestVersion) {
                        return;
                    }

                    this.errorMessage.set(
                        error.status === 401 || error.status === 403
                            ? 'Your admin session has expired or you no longer have permission.'
                            : 'Unable to load blogs. Please try again.',
                    );
                },
            });
    }
}
