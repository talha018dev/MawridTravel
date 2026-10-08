import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
    BlogForm,
    BlogFormSubmission,
} from '@app/features/admin/blogs/blog-form/blog-form';
import {
    Blog,
    BlogAdminService,
} from '@app/features/admin/blogs/services/blog-admin.service';
import { ButtonDirective } from '@openng/optimus-ui/button';
import { catchError, finalize, map, of, switchMap } from 'rxjs';

interface ValidationProblem {
    errors?: Record<string, string[]>;
}

@Component({
    selector: 'app-blog-edit',
    imports: [BlogForm, ButtonDirective, RouterLink],
    templateUrl: './blog-edit.html',
})
export class BlogEdit implements OnInit {
    private readonly blogAdminService = inject(BlogAdminService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly blogId = this.route.snapshot.paramMap.get('id')!;

    protected readonly blog = signal<Blog | null>(null);
    protected readonly loading = signal(true);
    protected readonly loadFailed = signal(false);
    protected readonly submitting = signal(false);
    protected readonly errorMessage = signal<string | null>(null);
    protected readonly serverErrors = signal<Record<string, string[]>>({});

    ngOnInit(): void {
        this.blogAdminService
            .getBlog(this.blogId)
            .pipe(finalize(() => this.loading.set(false)))
            .subscribe({
                next: (blog) => this.blog.set(blog),
                error: (error: HttpErrorResponse) => {
                    this.loadFailed.set(true);
                    this.errorMessage.set(
                        error.status === 404
                            ? 'This blog could not be found.'
                            : error.status === 401 || error.status === 403
                              ? 'Your admin session has expired or you no longer have permission.'
                              : 'Unable to load the blog. Please try again.',
                    );
                },
            });
    }

    protected submit(submission: BlogFormSubmission): void {
        this.errorMessage.set(null);
        this.serverErrors.set({});
        this.submitting.set(true);

        this.blogAdminService
            .updateBlog(this.blogId, submission.blog)
            .pipe(
                switchMap((blog) => {
                    if (submission.featuredImage) {
                        return this.blogAdminService
                            .uploadFeaturedImage(blog.id, submission.featuredImage)
                            .pipe(
                                map((updatedBlog) => ({ blog: updatedBlog, imageChanged: true })),
                                catchError(() => of({ blog, imageChanged: false })),
                            );
                    }
                    if (submission.removeFeaturedImage) {
                        return this.blogAdminService.deleteFeaturedImage(blog.id).pipe(
                            map(() => ({ blog, imageChanged: true })),
                            catchError(() => of({ blog, imageChanged: false })),
                        );
                    }
                    return of({ blog, imageChanged: true });
                }),
                finalize(() => this.submitting.set(false)),
            )
            .subscribe({
                next: ({ blog, imageChanged }) => {
                    if (!imageChanged) {
                        this.errorMessage.set(
                            'The blog details were saved, but the featured image change failed. Try saving again.',
                        );
                        return;
                    }
                    void this.router.navigate(['/admin/blog', blog.id], {
                        queryParams: { updated: 'true' },
                    });
                },
                error: (error: HttpErrorResponse) => this.handleError(error),
            });
    }

    protected clearErrors(): void {
        this.errorMessage.set(null);
        this.serverErrors.set({});
    }

    protected cancel(): void {
        void this.router.navigate(['/admin/blog', this.blogId]);
    }

    private handleError(error: HttpErrorResponse): void {
        const problem = error.error as ValidationProblem | null;
        if (error.status === 400 && problem?.errors) {
            this.serverErrors.set(problem.errors);
            this.errorMessage.set('Please review the highlighted fields and try again.');
            return;
        }
        this.errorMessage.set(
            error.status === 401 || error.status === 403
                ? 'Your admin session has expired or you no longer have permission.'
                : error.status === 404
                  ? 'This blog no longer exists.'
                  : 'Unable to update the blog. Please try again.',
        );
    }
}
