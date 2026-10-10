import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Params, Router, RouterLink } from '@angular/router';
import { BlogService, PublicBlog } from '@app/features/blogs/blog.service';
import { ButtonDirective } from '@openng/optimus-ui/button';
import { IconField } from '@openng/optimus-ui/iconfield';
import { InputIcon } from '@openng/optimus-ui/inputicon';
import { InputText } from '@openng/optimus-ui/inputtext';
import { debounceTime, distinctUntilChanged, finalize, map } from 'rxjs';

@Component({
    selector: 'app-public-blog-list',
    imports: [ButtonDirective, DatePipe, IconField, InputIcon, InputText, ReactiveFormsModule, RouterLink],
    templateUrl: './blog-list.html',
})
export class PublicBlogList implements OnInit {
    private readonly service = inject(BlogService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly pageSize = 9;

    protected readonly searchControl = new FormControl('', { nonNullable: true });
    protected readonly blogs = signal<PublicBlog[]>([]);
    protected readonly page = signal(1);
    protected readonly totalCount = signal(0);
    protected readonly loading = signal(true);
    protected readonly errorMessage = signal<string | null>(null);

    ngOnInit(): void {
        this.searchControl.valueChanges
            .pipe(map(value => value.trim()), debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
            .subscribe(() => void this.updateUrl());

        this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
            this.searchControl.setValue(params.get('search')?.trim() ?? '', { emitEvent: false });
            this.page.set(this.parsePage(params.get('page')));
            this.loadBlogs();
        });
    }

    protected totalPages(): number {
        return Math.max(1, Math.ceil(this.totalCount() / this.pageSize));
    }

    protected pageQuery(page: number): Params {
        return { search: this.searchControl.value.trim() || null, page: page > 1 ? page : null };
    }

    protected readingTime(blog: PublicBlog): number {
        const words = this.plainText(blog.content).split(/\s+/).filter(Boolean).length;
        return Math.max(1, Math.ceil(words / 220));
    }

    protected summary(blog: PublicBlog): string {
        const text = blog.excerpt?.trim() || this.plainText(blog.content);
        return text.length > 320 ? `${text.slice(0, 317).trimEnd()}…` : text;
    }

    protected clearSearch(): void {
        void this.router.navigate(['/blogs']);
    }

    protected retry(): void {
        this.loadBlogs();
    }

    private updateUrl(): Promise<boolean> {
        return this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { search: this.searchControl.value.trim() || null, page: null },
        });
    }

    private loadBlogs(): void {
        this.loading.set(true);
        this.errorMessage.set(null);
        this.service.getBlogs(this.searchControl.value.trim(), this.page(), this.pageSize)
            .pipe(finalize(() => this.loading.set(false)), takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: response => {
                    this.blogs.set(response.items);
                    this.totalCount.set(response.totalCount);
                },
                error: (error: HttpErrorResponse) => this.errorMessage.set(
                    error.status === 0
                        ? 'The travel blog is temporarily unavailable. Please try again.'
                        : 'Unable to load articles. Please try again.',
                ),
            });
    }

    private plainText(value: string): string {
        return value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
    }

    private parsePage(value: string | null): number {
        const page = Number(value);
        return Number.isInteger(page) && page > 0 ? page : 1;
    }
}
