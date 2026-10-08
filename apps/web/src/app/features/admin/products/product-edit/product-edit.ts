import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
    ProductForm,
    ProductFormSubmission,
} from '@app/features/admin/products/product-form/product-form';
import {
    Product,
    ProductAdminService,
} from '@app/features/admin/products/services/product-admin.service';
import { ButtonDirective } from '@openng/optimus-ui/button';
import { catchError, concat, concatMap, finalize, from, map, of, switchMap, toArray } from 'rxjs';

interface ImageChangeResult {
    kind: 'delete' | 'upload';
    id?: string;
    file?: File;
    succeeded: boolean;
}

interface ValidationProblem {
    errors?: Record<string, string[]>;
}

@Component({
    selector: 'app-product-edit',
    imports: [ButtonDirective, ProductForm, RouterLink],
    templateUrl: './product-edit.html',
})
export class ProductEdit implements OnInit {
    private readonly productAdminService = inject(ProductAdminService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly form = viewChild(ProductForm);
    private readonly productId = this.route.snapshot.paramMap.get('id')!;

    protected readonly product = signal<Product | null>(null);
    protected readonly loading = signal(true);
    protected readonly loadFailed = signal(false);
    protected readonly submitting = signal(false);
    protected readonly errorMessage = signal<string | null>(null);
    protected readonly serverErrors = signal<Record<string, string[]>>({});

    ngOnInit(): void {
        this.productAdminService
            .getProduct(this.productId)
            .pipe(finalize(() => this.loading.set(false)))
            .subscribe({
                next: (product) => this.product.set(product),
                error: (error: HttpErrorResponse) => {
                    this.loadFailed.set(true);
                    this.errorMessage.set(
                        error.status === 404
                            ? 'This product could not be found.'
                            : 'Unable to load the product. Please try again.',
                    );
                },
            });
    }

    protected submit(submission: ProductFormSubmission): void {
        this.errorMessage.set(null);
        this.serverErrors.set({});
        this.submitting.set(true);

        this.productAdminService
            .updateProduct(this.productId, submission.product)
            .pipe(
                switchMap((product) => this.applyImageChanges(product, submission)),
                finalize(() => this.submitting.set(false)),
            )
            .subscribe({
                next: ({ product, results }) => {
                    const failedUploads = results
                        .filter((result) => result.kind === 'upload' && !result.succeeded)
                        .map((result) => result.file!);
                    const failedDeletions = results
                        .filter((result) => result.kind === 'delete' && !result.succeeded)
                        .map((result) => result.id!);

                    if (failedUploads.length > 0 || failedDeletions.length > 0) {
                        this.form()?.retainFailedImageChanges(failedUploads, failedDeletions);
                        this.errorMessage.set(
                            'The product details were saved, but some image changes failed. The failed changes remain selected so you can retry.',
                        );
                        this.refreshProductImages();
                        return;
                    }

                    void this.router.navigate(['/admin/products', product.id], {
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
        void this.router.navigate(['/admin/products/list']);
    }

    private applyImageChanges(product: Product, submission: ProductFormSubmission) {
        const deletions$ = from(submission.imageIdsToDelete).pipe(
            concatMap((id) =>
                this.productAdminService.deleteImage(product.id, id).pipe(
                    map((): ImageChangeResult => ({ kind: 'delete', id, succeeded: true })),
                    catchError(() => of<ImageChangeResult>({ kind: 'delete', id, succeeded: false })),
                ),
            ),
        );
        const uploads$ = from(submission.newImages).pipe(
            concatMap((file) =>
                this.productAdminService.uploadImage(product.id, file, product.name, false).pipe(
                    map((): ImageChangeResult => ({ kind: 'upload', file, succeeded: true })),
                    catchError(() => of<ImageChangeResult>({ kind: 'upload', file, succeeded: false })),
                ),
            ),
        );

        return concat(deletions$, uploads$).pipe(
            toArray(),
            map((results) => ({ product, results })),
        );
    }

    private refreshProductImages(): void {
        this.productAdminService.getProduct(this.productId).subscribe({
            next: (product) => {
                this.product.set(product);
                this.form()?.refreshExistingImages(product.images);
            },
        });
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
                  ? 'This product no longer exists.'
                  : 'Unable to update the product. Please try again.',
        );
    }
}
