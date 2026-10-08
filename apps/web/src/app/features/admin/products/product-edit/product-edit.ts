import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
    AbstractControl,
    FormControl,
    FormGroup,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
    CreateProductRequest,
    Product,
    ProductAdminService,
    ProductImage,
} from '@app/features/admin/products/services/product-admin.service';
import { Button, ButtonDirective } from '@openng/optimus-ui/button';
import { FileUpload } from '@openng/optimus-ui/fileupload';
import { InputNumber } from '@openng/optimus-ui/inputnumber';
import { InputText } from '@openng/optimus-ui/inputtext';
import { Message } from '@openng/optimus-ui/message';
import { Textarea } from '@openng/optimus-ui/textarea';
import { ToggleSwitch } from '@openng/optimus-ui/toggleswitch';
import { FileRemoveEvent, FileSelectEvent } from '@openng/optimus-ui/types/fileupload';
import { catchError, concat, concatMap, finalize, from, map, Observable, of, switchMap, toArray } from 'rxjs';

interface ImageChangeResult {
    kind: 'delete' | 'upload';
    id?: string;
    file?: File;
    succeeded: boolean;
}

interface ValidationProblem {
    errors?: Record<string, string[]>;
}

function wholeNumberValidator(control: AbstractControl): Record<string, boolean> | null {
    const value = control.value as number | null;
    return value === null || Number.isInteger(value) ? null : { wholeNumber: true };
}

@Component({
    selector: 'app-product-edit',
    imports: [
        Button,
        ButtonDirective,
        FileUpload,
        InputNumber,
        InputText,
        Message,
        ReactiveFormsModule,
        RouterLink,
        Textarea,
        ToggleSwitch,
    ],
    templateUrl: './product-edit.html',
})
export class ProductEdit implements OnInit {
    private readonly productAdminService = inject(ProductAdminService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly destroyRef = inject(DestroyRef);
    private readonly productId = this.route.snapshot.paramMap.get('id')!;

    protected readonly loading = signal(true);
    protected readonly loadFailed = signal(false);
    protected readonly submitAttempted = signal(false);
    protected readonly saving = signal(false);
    protected readonly maxImageBytes = 5 * 1024 * 1024;
    protected readonly existingImages = signal<ProductImage[]>([]);
    protected readonly selectedImages = signal<File[]>([]);
    protected readonly imageIdsToDelete = signal<string[]>([]);
    protected readonly remainingImageSlots = computed(
        () =>
            10 -
            (this.existingImages().length - this.imageIdsToDelete().length),
    );
    protected readonly errorMessage = signal<string | null>(null);
    protected readonly serverErrors = signal<Record<string, string[]>>({});
    protected readonly productForm = new FormGroup({
        name: new FormControl('', {
            nonNullable: true,
            validators: [Validators.required, Validators.maxLength(200)],
        }),
        slug: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(220)] }),
        description: new FormControl('', {
            nonNullable: true,
            validators: [Validators.maxLength(10_000)],
        }),
        sku: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(64)] }),
        price: new FormControl<number | null>(null, [Validators.required, Validators.min(0)]),
        compareAtPrice: new FormControl<number | null>(null, [Validators.min(0)]),
        currency: new FormControl('BDT', {
            nonNullable: true,
            validators: [Validators.required, Validators.pattern(/^[A-Za-z]{3}$/)],
        }),
        stockQuantity: new FormControl<number | null>(0, [
            Validators.required,
            Validators.min(0),
            wholeNumberValidator,
        ]),
        isActive: new FormControl(false, { nonNullable: true }),
    });

    constructor() {
        for (const [field, control] of Object.entries(this.productForm.controls)) {
            this.clearServerErrorOnChange(field, control);
        }
    }

    protected get controls() {
        return this.productForm.controls;
    }

    ngOnInit(): void {
        this.productAdminService
            .getProduct(this.productId)
            .pipe(finalize(() => this.loading.set(false)))
            .subscribe({
                next: (product) => {
                    this.productForm.setValue({
                        name: product.name,
                        slug: product.slug,
                        description: product.description ?? '',
                        sku: product.sku ?? '',
                        price: product.price,
                        compareAtPrice: product.compareAtPrice,
                        currency: product.currency,
                        stockQuantity: product.stockQuantity,
                        isActive: product.isActive,
                    });
                    this.existingImages.set(product.images);
                },
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

    protected onImagesSelected(event: FileSelectEvent): void {
        this.selectedImages.set(event.currentFiles);
        this.errorMessage.set(null);
    }

    protected onImageRemoved(event: FileRemoveEvent): void {
        this.selectedImages.update((files) => files.filter((file) => file !== event.file));
    }

    protected clearImages(): void {
        this.selectedImages.set([]);
    }

    protected toggleImageRemoval(imageId: string): void {
        this.imageIdsToDelete.update((ids) =>
            ids.includes(imageId) ? ids.filter((id) => id !== imageId) : [...ids, imageId],
        );
    }

    protected imageWillBeRemoved(imageId: string): boolean {
        return this.imageIdsToDelete().includes(imageId);
    }

    protected selectedImagePreview(file: File): string {
        return (file as File & { objectURL?: string }).objectURL ?? '';
    }

    protected formatFileSize(bytes: number): string {
        return `${(bytes / 1024).toLocaleString(undefined, { maximumFractionDigits: 1 })} KB`;
    }

    protected saveProduct(): void {
        this.submitAttempted.set(true);
        this.errorMessage.set(null);
        this.serverErrors.set({});

        if (this.productForm.invalid) {
            this.productForm.markAllAsTouched();
            return;
        }

        this.saving.set(true);
        this.errorMessage.set(null);
        this.productAdminService
            .updateProduct(this.productId, this.buildRequest())
            .pipe(
                switchMap((product) => this.applyImageChanges(product)),
                finalize(() => this.saving.set(false)),
            )
            .subscribe({
                next: ({ product, results }) => {
                    const failedUploads = results
                        .filter((result) => result.kind === 'upload' && !result.succeeded)
                        .map((result) => result.file!);
                    const failedDeletions = results
                        .filter((result) => result.kind === 'delete' && !result.succeeded)
                        .map((result) => result.id!);

                    this.selectedImages.set(failedUploads);
                    this.imageIdsToDelete.set(failedDeletions);

                    if (failedUploads.length > 0 || failedDeletions.length > 0) {
                        this.errorMessage.set(
                            'The product details were saved, but some image changes failed. The failed changes remain selected so you can retry.',
                        );
                        this.refreshExistingImages();
                        return;
                    }

                    void this.router.navigate(['/admin/products', product.id], {
                        queryParams: { updated: 'true' },
                    });
                },
                error: (error: HttpErrorResponse) => this.handleUpdateError(error),
            });
    }

    private applyImageChanges(
        product: Product,
    ): Observable<{ product: Product; results: ImageChangeResult[] }> {
        const deletions$ = from(this.imageIdsToDelete()).pipe(
            concatMap((id) =>
                this.productAdminService.deleteImage(product.id, id).pipe(
                    map((): ImageChangeResult => ({ kind: 'delete', id, succeeded: true })),
                    catchError(() =>
                        of<ImageChangeResult>({ kind: 'delete', id, succeeded: false }),
                    ),
                ),
            ),
        );
        const uploads$ = from(this.selectedImages()).pipe(
            concatMap((file) =>
                this.productAdminService.uploadImage(product.id, file, product.name, false).pipe(
                    map((): ImageChangeResult => ({ kind: 'upload', file, succeeded: true })),
                    catchError(() =>
                        of<ImageChangeResult>({ kind: 'upload', file, succeeded: false }),
                    ),
                ),
            ),
        );

        return concat(deletions$, uploads$).pipe(
            toArray(),
            map((results) => ({ product, results })),
        );
    }

    private refreshExistingImages(): void {
        this.productAdminService.getProduct(this.productId).subscribe({
            next: (product) => this.existingImages.set(product.images),
        });
    }

    private buildRequest(): CreateProductRequest {
        const value = this.productForm.getRawValue();
        return {
            name: value.name.trim(),
            slug: this.optionalValue(value.slug),
            description: this.optionalValue(value.description),
            sku: this.optionalValue(value.sku),
            price: value.price!,
            compareAtPrice: value.compareAtPrice,
            currency: value.currency.trim().toUpperCase(),
            stockQuantity: value.stockQuantity!,
            isActive: value.isActive,
        };
    }

    private handleUpdateError(error: HttpErrorResponse): void {
        const problem = error.error as ValidationProblem | null;
        if (error.status === 400 && problem?.errors) {
            this.serverErrors.set(problem.errors);
            for (const field of Object.keys(problem.errors)) {
                const control = this.productForm.get(field);
                control?.setErrors({ ...control.errors, server: true });
            }
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

    private optionalValue(value: string): string | null {
        const normalized = value.trim();
        return normalized || null;
    }

    private clearServerErrorOnChange(field: string, control: AbstractControl): void {
        control.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
            const errors = this.serverErrors();
            if (!errors[field]) {
                return;
            }

            const remainingErrors = { ...errors };
            delete remainingErrors[field];
            this.serverErrors.set(remainingErrors);

            if (control.hasError('server')) {
                const remainingControlErrors = { ...control.errors };
                delete remainingControlErrors['server'];
                control.setErrors(
                    Object.keys(remainingControlErrors).length ? remainingControlErrors : null,
                );
            }

            if (Object.keys(remainingErrors).length === 0) {
                this.errorMessage.set(null);
            }
        });
    }
}
