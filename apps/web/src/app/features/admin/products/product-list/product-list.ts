import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
    Product,
    ProductAdminService,
    ProductListResponse,
} from '@app/features/admin/products/services/product-admin.service';
import { Button, ButtonDirective } from '@openng/optimus-ui/button';
import { ConfirmDialog } from '@openng/optimus-ui/confirmdialog';
import { IconField } from '@openng/optimus-ui/iconfield';
import { InputIcon } from '@openng/optimus-ui/inputicon';
import { InputText } from '@openng/optimus-ui/inputtext';
import { Select } from '@openng/optimus-ui/select';
import { TableModule } from '@openng/optimus-ui/table';
import { Toast } from '@openng/optimus-ui/toast';
import { Tooltip } from '@openng/optimus-ui/tooltip';
import { ConfirmationService, MessageService } from '@openng/optimus-ui/api';
import { TablePageEvent } from '@openng/optimus-ui/types/table';
import {
    catchError,
    debounceTime,
    distinctUntilChanged,
    finalize,
    map,
    of,
    Subject,
    switchMap,
    tap,
} from 'rxjs';

type ProductStatusFilter = 'all' | 'active' | 'inactive';

interface ProductListRequest {
    search: string;
    status: ProductStatusFilter;
    page: number;
}

@Component({
    selector: 'app-product-list',
    providers: [ConfirmationService, MessageService],
    imports: [
        Button,
        ButtonDirective,
        ConfirmDialog,
        DatePipe,
        IconField,
        InputIcon,
        InputText,
        ReactiveFormsModule,
        RouterLink,
        Select,
        TableModule,
        Toast,
        Tooltip,
    ],
    templateUrl: './product-list.html',
})
export class ProductList implements OnInit {
    private readonly productAdminService = inject(ProductAdminService);
    private readonly confirmationService = inject(ConfirmationService);
    private readonly messageService = inject(MessageService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly requestChanges = new Subject<ProductListRequest>();

    protected readonly pageSize = 20;
    protected readonly searchControl = new FormControl('', { nonNullable: true });
    protected readonly statusControl = new FormControl<ProductStatusFilter>('all', {
        nonNullable: true,
    });
    protected readonly statusOptions: Array<{
        label: string;
        value: ProductStatusFilter;
    }> = [
            { label: 'All products', value: 'all' },
            { label: 'Active', value: 'active' },
            { label: 'Inactive', value: 'inactive' },
        ];
    protected readonly products = signal<Product[]>([]);
    protected readonly page = signal(1);
    protected readonly totalCount = signal(0);
    protected readonly loading = signal(true);
    protected readonly deletingId = signal<string | null>(null);
    protected readonly errorMessage = signal<string | null>(null);

    ngOnInit(): void {
        this.requestChanges
            .pipe(
                tap(() => {
                    this.loading.set(true);
                    this.errorMessage.set(null);
                }),
                switchMap(({ search, status, page }) =>
                    this.productAdminService
                        .getProducts({
                            search: search || undefined,
                            isActive: status === 'all' ? undefined : status === 'active',
                            page,
                            pageSize: this.pageSize,
                        })
                        .pipe(
                            catchError((error: HttpErrorResponse) => {
                                this.errorMessage.set(
                                    error.status === 401 || error.status === 403
                                        ? 'Your admin session has expired or you no longer have permission.'
                                        : 'Unable to load products. Please try again.',
                                );
                                return of<ProductListResponse>({
                                    page,
                                    pageSize: this.pageSize,
                                    totalCount: 0,
                                    items: [],
                                });
                            }),
                            tap(() => this.loading.set(false)),
                        ),
                ),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe((response) => {
                this.page.set(response.page);
                this.totalCount.set(response.totalCount);
                this.products.set(response.items);
            });

        this.searchControl.valueChanges
            .pipe(
                map((value) => value.trim()),
                debounceTime(350),
                distinctUntilChanged(),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe(() => void this.updateUrl());

        this.statusControl.valueChanges
            .pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
            .subscribe(() => void this.updateUrl());

        this.route.queryParamMap
            .pipe(
                map((params) => ({
                    search: params.get('search')?.trim() ?? '',
                    status: this.parseStatus(params.get('status')),
                })),
                distinctUntilChanged(
                    (previous, current) =>
                        previous.search === current.search && previous.status === current.status,
                ),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe(({ search, status }) => {
                this.searchControl.setValue(search, { emitEvent: false });
                this.statusControl.setValue(status, { emitEvent: false });
                this.requestPage(1);
            });
    }

    protected changePage(event: TablePageEvent): void {
        this.requestPage(Math.floor(event.first / event.rows) + 1);
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

    private confirmDelete(product: Product): void {
        this.deletingId.set(product.id);
        this.errorMessage.set(null);
        this.productAdminService
            .deleteProduct(product.id)
            .pipe(
                finalize(() => this.deletingId.set(null)),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe({
                next: () => {
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Product deleted',
                        detail: `“${product.name}” was deleted successfully.`,
                    });

                    if (this.products().length === 1 && this.page() > 1) {
                        this.requestPage(this.page() - 1);
                    } else {
                        this.requestPage(this.page());
                    }
                },
                error: () => this.errorMessage.set('Unable to delete the product. Please try again.'),
            });
    }

    protected formatPrice(product: Product): string {
        if (product.currency.toUpperCase() === 'BDT') {
            return `৳ ${new Intl.NumberFormat('en-BD', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }).format(product.price)}`;
        }

        try {
            return new Intl.NumberFormat(undefined, {
                style: 'currency',
                currency: product.currency,
            }).format(product.price);
        } catch {
            return `${product.price.toFixed(2)} ${product.currency}`;
        }
    }

    private updateUrl(): Promise<boolean> {
        const search = this.searchControl.value.trim();
        const status = this.statusControl.value;

        return this.router.navigate([], {
            relativeTo: this.route,
            queryParams: {
                search: search || null,
                status: status === 'all' ? null : status,
            },
            replaceUrl: true,
        });
    }

    private parseStatus(value: string | null): ProductStatusFilter {
        return value === 'active' || value === 'inactive' ? value : 'all';
    }

    private requestPage(page: number): void {
        this.requestChanges.next({
            search: this.searchControl.value.trim(),
            status: this.statusControl.value,
            page,
        });
    }
}
