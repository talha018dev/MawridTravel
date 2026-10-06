import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  CreateProductRequest,
  ProductAdminService,
} from '@app/features/admin/products/data-access/product-admin.service';
import { Button, ButtonDirective } from '@openng/optimus-ui/button';
import { InputNumber } from '@openng/optimus-ui/inputnumber';
import { InputText } from '@openng/optimus-ui/inputtext';
import { Textarea } from '@openng/optimus-ui/textarea';
import { ToggleSwitch } from '@openng/optimus-ui/toggleswitch';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-product-edit',
  imports: [
    Button,
    ButtonDirective,
    InputNumber,
    InputText,
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
  private readonly productId = this.route.snapshot.paramMap.get('id')!;

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
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
    stockQuantity: new FormControl<number | null>(0, [Validators.required, Validators.min(0)]),
    isActive: new FormControl(false, { nonNullable: true }),
  });

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
        error: () => this.errorMessage.set('Unable to load the product.'),
      });
  }

  protected saveProduct(): void {
    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      this.errorMessage.set('Please review the product details and try again.');
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);
    this.productAdminService
      .updateProduct(this.productId, this.buildRequest())
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => void this.router.navigate(['/admin/products/list']),
        error: (error: HttpErrorResponse) =>
          this.errorMessage.set(
            error.status === 401 || error.status === 403
              ? 'Your admin session has expired or you no longer have permission.'
              : 'Unable to update the product. Please try again.',
          ),
      });
  }

  private buildRequest(): CreateProductRequest {
    const value = this.productForm.getRawValue();
    return {
      name: value.name.trim(),
      slug: value.slug.trim() || null,
      description: value.description.trim() || null,
      sku: value.sku.trim() || null,
      price: value.price!,
      compareAtPrice: value.compareAtPrice,
      currency: value.currency.trim().toUpperCase(),
      stockQuantity: value.stockQuantity!,
      isActive: value.isActive,
    };
  }
}
