import { DOCUMENT, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BlogService, PublicBlog } from '@app/features/blogs/blog.service';
import { ButtonDirective } from '@openng/optimus-ui/button';
import { Meta, Title } from '@angular/platform-browser';
import { finalize } from 'rxjs';

@Component({
    selector: 'app-public-blog-details',
    imports: [ButtonDirective, DatePipe, RouterLink],
    templateUrl: './blog-details.html',
})
export class PublicBlogDetails implements OnInit {
    private readonly service = inject(BlogService);
    private readonly route = inject(ActivatedRoute);
    private readonly destroyRef = inject(DestroyRef);
    private readonly document = inject(DOCUMENT);
    private readonly meta = inject(Meta);
    private readonly title = inject(Title);

    protected readonly blog = signal<PublicBlog | null>(null);
    protected readonly loading = signal(true);
    protected readonly errorMessage = signal<string | null>(null);

    ngOnInit(): void {
        const slug = this.route.snapshot.paramMap.get('slug');
        if (!slug) {
            this.loading.set(false);
            this.errorMessage.set('This article could not be found.');
            return;
        }

        this.service.getBlog(slug)
            .pipe(finalize(() => this.loading.set(false)), takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: blog => {
                    this.blog.set(blog);
                    this.configureSeo(blog);
                },
                error: (error: HttpErrorResponse) => this.errorMessage.set(
                    error.status === 404
                        ? 'This article is no longer available.'
                        : 'Unable to load this article. Please try again.',
                ),
            });
    }

    protected readingTime(blog: PublicBlog): number {
        const words = blog.content.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean).length;
        return Math.max(1, Math.ceil(words / 220));
    }

    private configureSeo(blog: PublicBlog): void {
        const pageTitle = `${blog.title} | Mawrid Travel`;
        const description = blog.excerpt || `Read ${blog.title} on the Mawrid Travel blog.`;
        const url = `https://mawridtravel.com/blogs/${blog.slug}`;
        this.title.setTitle(pageTitle);
        this.meta.updateTag({ name: 'description', content: description });
        this.meta.updateTag({ property: 'og:title', content: pageTitle });
        this.meta.updateTag({ property: 'og:description', content: description });
        this.meta.updateTag({ property: 'og:type', content: 'article' });
        this.meta.updateTag({ property: 'og:url', content: url });
        if (blog.featuredImageUrl) this.meta.updateTag({ property: 'og:image', content: blog.featuredImageUrl });

        let canonical = this.document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
        if (!canonical) {
            canonical = this.document.createElement('link');
            canonical.rel = 'canonical';
            this.document.head.appendChild(canonical);
        }
        canonical.href = url;
    }
}
