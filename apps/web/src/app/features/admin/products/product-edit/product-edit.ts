import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
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
    ProductAdminService,
} from '@app/features/admin/products/services/product-admin.service';
import { Button, ButtonDirective } from '@openng/optimus-ui/button';
import { InputNumber } from '@openng/optimus-ui/inputnumber';
import { InputText } from '@openng/optimus-ui/inputtext';
import { Message } from '@openng/optimus-ui/message';
import { Textarea } from '@openng/optimus-ui/textarea';
import { ToggleSwitch } from '@openng/optimus-ui/toggleswitch';
import { finalize } from 'rxjs';

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
                next: (product) =>
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
                    }),
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
            .pipe(finalize(() => this.saving.set(false)))
            .subscribe({
                next: (product) =>
                    void this.router.navigate(['/admin/products', product.id], {
                        queryParams: { updated: 'true' },
                    }),
                error: (error: HttpErrorResponse) => this.handleUpdateError(error),
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
