import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  CreateProductRequest,
  Product,
  ProductAdminService,
} from '@app/features/admin/products/data-access/product-admin.service';
import { Button } from '@openng/optimus-ui/button';
import { FileUpload } from '@openng/optimus-ui/fileupload';
import { InputNumber } from '@openng/optimus-ui/inputnumber';
import { InputText } from '@openng/optimus-ui/inputtext';
import { Message } from '@openng/optimus-ui/message';
import { Textarea } from '@openng/optimus-ui/textarea';
import { ToggleSwitch } from '@openng/optimus-ui/toggleswitch';
import { FileRemoveEvent, FileSelectEvent } from '@openng/optimus-ui/types/fileupload';
import {
  catchError,
  concatMap,
  finalize,
  from,
  map,
  Observable,
  of,
  switchMap,
  toArray,
} from 'rxjs';

interface ImageUploadResult {
  file: File;
  succeeded: boolean;
}

interface ValidationProblem {
  title?: string;
  errors?: Record<string, string[]>;
}

function compareAtPriceValidator(control: AbstractControl): ValidationErrors | null {
  const price = control.get('price')?.value as number | null;
  const compareAtPrice = control.get('compareAtPrice')?.value as number | null;

  if (price === null || compareAtPrice === null) {
    return null;
  }

  return compareAtPrice >= price ? null : { compareAtPriceBelowPrice: true };
}

function wholeNumberValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value as number | null;
  return value === null || Number.isInteger(value) ? null : { wholeNumber: true };
}

@Component({
  selector: 'app-product-create',
  imports: [
    Button,
    FileUpload,
    InputNumber,
    InputText,
    Message,
    ReactiveFormsModule,
    RouterLink,
    Textarea,
    ToggleSwitch,
  ],
  templateUrl: './product-create.html',
})
export class ProductCreate {
  private readonly productAdminService = inject(ProductAdminService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly maxImageBytes = 5 * 1024 * 1024;
  protected readonly submitAttempted = signal(false);
  protected readonly submitting = signal(false);
  protected readonly selectedImages = signal<File[]>([]);
  protected readonly createdProduct = signal<Product | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly serverErrors = signal<Record<string, string[]>>({});

  protected readonly productForm = new FormGroup(
    {
      name: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.maxLength(200)],
      }),
      slug: new FormControl('', {
        nonNullable: true,
        validators: [Validators.maxLength(220)],
      }),
      description: new FormControl('', {
        nonNullable: true,
        validators: [Validators.maxLength(10_000)],
      }),
      sku: new FormControl('', {
        nonNullable: true,
        validators: [Validators.maxLength(64)],
      }),
      price: new FormControl<number | null>(null, {
        validators: [Validators.required, Validators.min(0)],
      }),
      compareAtPrice: new FormControl<number | null>(null, {
        validators: [Validators.min(0)],
      }),
      currency: new FormControl('BDT', {
        nonNullable: true,
        validators: [Validators.required, Validators.pattern(/^[A-Za-z]{3}$/)],
      }),
      stockQuantity: new FormControl<number | null>(0, {
        validators: [Validators.required, Validators.min(0), wholeNumberValidator],
      }),
      isActive: new FormControl(false, { nonNullable: true }),
    },
    { validators: compareAtPriceValidator },
  );

  constructor() {
    for (const [field, control] of Object.entries(this.productForm.controls)) {
      this.clearServerErrorOnChange(field, control);
    }
  }

  protected get controls() {
    return this.productForm.controls;
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

  protected cancel(): void {
    void this.router.navigate(['/admin/dashboard']);
  }

  protected submitProduct(): void {
    this.submitAttempted.set(true);
    this.errorMessage.set(null);
    this.serverErrors.set({});

    const existingProduct = this.createdProduct();
    if (!existingProduct && this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      return;
    }

    if (existingProduct && this.selectedImages().length === 0) {
      void this.router.navigate(['/admin/dashboard']);
      return;
    }

    this.submitting.set(true);
    const productRequest$ = existingProduct
      ? of(existingProduct)
      : this.productAdminService.createProduct(this.buildRequest());

    productRequest$
      .pipe(
        switchMap((product) => {
          this.createdProduct.set(product);
          return this.uploadSelectedImages(product, existingProduct === null);
        }),
        finalize(() => this.submitting.set(false)),
      )
      .subscribe({
        next: (results) => {
          const failedFiles = results.filter((result) => !result.succeeded).map(({ file }) => file);
          if (failedFiles.length > 0) {
            this.selectedImages.set(failedFiles);
            this.errorMessage.set(
              `The product was created, but ${failedFiles.length} image${failedFiles.length === 1 ? '' : 's'} could not be uploaded. The failed images remain selected so you can retry.`,
            );
            return;
          }

          void this.router.navigate(['/admin/dashboard'], {
            queryParams: { productCreated: 'true' },
          });
        },
        error: (error: HttpErrorResponse) => this.handleCreateError(error),
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

  private uploadSelectedImages(
    product: Product,
    makeFirstImagePrimary: boolean,
  ): Observable<ImageUploadResult[]> {
    const images = this.selectedImages();
    if (images.length === 0) {
      return of([]);
    }

    return from(images).pipe(
      concatMap((file, index) =>
        this.productAdminService
          .uploadImage(product.id, file, product.name, makeFirstImagePrimary && index === 0)
          .pipe(
            map(() => ({ file, succeeded: true })),
            catchError(() => of({ file, succeeded: false })),
          ),
      ),
      toArray(),
    );
  }

  private handleCreateError(error: HttpErrorResponse): void {
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
        : 'Unable to create the product. Please try again.',
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
      if (Object.keys(remainingErrors).length === 0) {
        this.errorMessage.set(null);
      }
    });
  }
}
