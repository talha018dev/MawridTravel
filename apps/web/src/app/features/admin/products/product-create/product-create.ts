import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import {
    ProductForm,
    ProductFormSubmission,
} from '@app/features/admin/products/product-form/product-form';
import {
    Product,
    ProductAdminService,
} from '@app/features/admin/products/services/product-admin.service';
import { catchError, concatMap, finalize, from, map, of, switchMap, toArray } from 'rxjs';

interface ValidationProblem {
    errors?: Record<string, string[]>;
}

@Component({
    selector: 'app-product-create',
    imports: [ProductForm],
    templateUrl: './product-create.html',
})
export class ProductCreate {
    private readonly productAdminService = inject(ProductAdminService);
    private readonly router = inject(Router);
    private readonly form = viewChild(ProductForm);

    protected readonly submitting = signal(false);
    protected readonly errorMessage = signal<string | null>(null);
    protected readonly serverErrors = signal<Record<string, string[]>>({});
    private readonly createdProduct = signal<Product | null>(null);

    protected submit(submission: ProductFormSubmission): void {
        this.errorMessage.set(null);
        this.serverErrors.set({});
        this.submitting.set(true);

        const existingProduct = this.createdProduct();
        const product$ = existingProduct
            ? this.productAdminService.updateProduct(existingProduct.id, submission.product)
            : this.productAdminService.createProduct(submission.product);

        product$
            .pipe(
                switchMap((product) => {
                    this.createdProduct.set(product);
                    return from(submission.newImages).pipe(
                        concatMap((file, index) =>
                            this.productAdminService
                                .uploadImage(
                                    product.id,
                                    file,
                                    product.name,
                                    existingProduct === null && index === 0,
                                )
                                .pipe(
                                    map(() => ({ file, succeeded: true })),
                                    catchError(() => of({ file, succeeded: false })),
                                ),
                        ),
                        toArray(),
                        map((results) => ({ product, results })),
                    );
                }),
                finalize(() => this.submitting.set(false)),
            )
            .subscribe({
                next: ({ results }) => {
                    const failedFiles = results
                        .filter((result) => !result.succeeded)
                        .map((result) => result.file);
                    if (failedFiles.length > 0) {
                        this.form()?.retainFailedImageChanges(failedFiles);
                        this.errorMessage.set(
                            `The product was created, but ${failedFiles.length} image${failedFiles.length === 1 ? '' : 's'} could not be uploaded. The failed images remain selected so you can retry.`,
                        );
                        return;
                    }

                    void this.router.navigate(['/admin/products/list'], {
                        queryParams: { created: 'true' },
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
                : 'Unable to create the product. Please try again.',
        );
    }
}
