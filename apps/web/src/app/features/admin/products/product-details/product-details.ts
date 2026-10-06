import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  Product,
  ProductAdminService,
} from '@app/features/admin/products/data-access/product-admin.service';
import { ConfirmationService } from '@openng/optimus-ui/api';
import { Button, ButtonDirective } from '@openng/optimus-ui/button';
import { ConfirmDialog } from '@openng/optimus-ui/confirmdialog';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-product-details',
  providers: [ConfirmationService],
  imports: [Button, ButtonDirective, ConfirmDialog, DatePipe, RouterLink],
  templateUrl: './product-details.html',
})
export class ProductDetails implements OnInit {
  private readonly productAdminService = inject(ProductAdminService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly productId = this.route.snapshot.paramMap.get('id')!;

  protected readonly product = signal<Product | null>(null);
  protected readonly loading = signal(true);
  protected readonly deleting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.productAdminService
      .getProduct(this.productId)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (product) => this.product.set(product),
        error: () => this.errorMessage.set('Unable to load the product details.'),
      });
  }

  protected deleteProduct(product: Product): void {
    this.confirmationService.confirm({
      header: 'Delete product',
      message: `Delete “${product.name}”? This action cannot be undone.`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary p-button-outlined',
      accept: () => this.confirmDelete(product),
    });
  }

  protected formatPrice(amount: number, currency: string): string {
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);
    } catch {
      return `${amount.toFixed(2)} ${currency}`;
    }
  }

  private confirmDelete(product: Product): void {
    this.deleting.set(true);
    this.errorMessage.set(null);
    this.productAdminService
      .deleteProduct(product.id)
      .pipe(finalize(() => this.deleting.set(false)))
      .subscribe({
        next: () => void this.router.navigate(['/admin/products/list']),
        error: () => this.errorMessage.set('Unable to delete the product. Please try again.'),
      });
  }
}
