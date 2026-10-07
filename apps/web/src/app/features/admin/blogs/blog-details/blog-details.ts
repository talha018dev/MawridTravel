import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
    Blog,
    BlogAdminService,
} from '@app/features/admin/blogs/services/blog-admin.service';
import { ConfirmationService, MessageService } from '@openng/optimus-ui/api';
import { Button, ButtonDirective } from '@openng/optimus-ui/button';
import { ConfirmDialog } from '@openng/optimus-ui/confirmdialog';
import { Toast } from '@openng/optimus-ui/toast';
import { finalize } from 'rxjs';

@Component({
    selector: 'app-blog-details',
    providers: [ConfirmationService, MessageService],
    imports: [Button, ButtonDirective, ConfirmDialog, DatePipe, RouterLink, Toast],
    templateUrl: './blog-details.html',
    styleUrl: './blog-details.css',
    encapsulation: ViewEncapsulation.None,
})
export class BlogDetails implements OnInit {
    private readonly blogAdminService = inject(BlogAdminService);
    private readonly confirmationService = inject(ConfirmationService);
    private readonly messageService = inject(MessageService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly blogId = this.route.snapshot.paramMap.get('id')!;

    protected readonly blog = signal<Blog | null>(null);
    protected readonly loading = signal(true);
    protected readonly deleting = signal(false);
    protected readonly errorMessage = signal<string | null>(null);

    ngOnInit(): void {
        this.blogAdminService
            .getBlog(this.blogId)
            .pipe(finalize(() => this.loading.set(false)))
            .subscribe({
                next: (blog) => this.blog.set(blog),
                error: (error: HttpErrorResponse) =>
                    this.errorMessage.set(
                        error.status === 404
                            ? 'This blog could not be found.'
                            : error.status === 401 || error.status === 403
                              ? 'Your admin session has expired or you no longer have permission.'
                              : 'Unable to load the blog. Please try again.',
                    ),
            });
    }

    protected deleteBlog(blog: Blog): void {
        this.confirmationService.confirm({
            header: 'Delete blog',
            message: `Delete “${blog.title}”? This action cannot be undone.`,
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Delete',
            rejectLabel: 'Cancel',
            acceptButtonStyleClass: 'p-button-danger',
            rejectButtonStyleClass: 'p-button-secondary p-button-outlined',
            accept: () => this.confirmDelete(blog),
        });
    }

    private confirmDelete(blog: Blog): void {
        this.deleting.set(true);
        this.errorMessage.set(null);
        this.blogAdminService
            .deleteBlog(blog.id)
            .pipe(finalize(() => this.deleting.set(false)))
            .subscribe({
                next: () => {
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Blog deleted',
                        detail: `“${blog.title}” was deleted successfully.`,
                    });
                    setTimeout(() => void this.router.navigate(['/admin/blog']), 500);
                },
                error: () =>
                    this.errorMessage.set('Unable to delete the blog. Please try again.'),
            });
    }
}
