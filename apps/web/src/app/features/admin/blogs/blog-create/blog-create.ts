import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
    BlogForm,
    BlogFormSubmission,
} from '@app/features/admin/blogs/blog-form/blog-form';
import {
    Blog,
    BlogAdminService,
} from '@app/features/admin/blogs/services/blog-admin.service';
import { catchError, finalize, map, of, switchMap } from 'rxjs';

interface ValidationProblem {
    errors?: Record<string, string[]>;
}

@Component({
    selector: 'app-blog-create',
    imports: [BlogForm],
    templateUrl: './blog-create.html',
})
export class BlogCreate {
    private readonly blogAdminService = inject(BlogAdminService);
    private readonly router = inject(Router);

    protected readonly submitting = signal(false);
    protected readonly errorMessage = signal<string | null>(null);
    protected readonly serverErrors = signal<Record<string, string[]>>({});
    private readonly createdBlog = signal<Blog | null>(null);

    protected submit(submission: BlogFormSubmission): void {
        this.errorMessage.set(null);
        this.serverErrors.set({});
        this.submitting.set(true);

        const existingBlog = this.createdBlog();
        const blog$ = existingBlog
            ? this.blogAdminService.updateBlog(existingBlog.id, submission.blog)
            : this.blogAdminService.createBlog(submission.blog);

        blog$
            .pipe(
                switchMap((blog) => {
                    this.createdBlog.set(blog);
                    if (!submission.featuredImage) {
                        return of({ blog, imageUploaded: true });
                    }

                    return this.blogAdminService
                        .uploadFeaturedImage(blog.id, submission.featuredImage)
                        .pipe(
                            map((updatedBlog) => ({ blog: updatedBlog, imageUploaded: true })),
                            catchError(() => of({ blog, imageUploaded: false })),
                        );
                }),
                finalize(() => this.submitting.set(false)),
            )
            .subscribe({
                next: ({ imageUploaded }) => {
                    if (!imageUploaded) {
                        this.errorMessage.set(
                            'The blog was created, but the featured image could not be uploaded. The image remains selected so you can retry.',
                        );
                        return;
                    }
                    void this.router.navigate(['/admin/blog']);
                },
                error: (error: HttpErrorResponse) => this.handleError(error),
            });
    }

    protected clearErrors(): void {
        this.errorMessage.set(null);
        this.serverErrors.set({});
    }

    protected cancel(): void {
        void this.router.navigate(['/admin/blog']);
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
                : 'Unable to create the blog. Please try again.',
        );
    }
}
