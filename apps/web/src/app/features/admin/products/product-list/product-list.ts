import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
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
    BehaviorSubject,
    catchError,
    combineLatest,
    debounceTime,
    distinctUntilChanged,
    finalize,
    map,
    of,
    startWith,
    switchMap,
    tap,
} from 'rxjs';

type ProductStatusFilter = 'all' | 'active' | 'inactive';

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
    private readonly pageChanges = new BehaviorSubject(1);

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
        const search$ = this.searchControl.valueChanges.pipe(
            startWith(this.searchControl.value),
            map((value) => value.trim()),
            debounceTime(350),
            distinctUntilChanged(),
            tap(() => this.resetToFirstPage()),
        );
        const status$ = this.statusControl.valueChanges.pipe(
            startWith(this.statusControl.value),
            distinctUntilChanged(),
            tap(() => this.resetToFirstPage()),
        );

        combineLatest([search$, status$, this.pageChanges])
            .pipe(
                tap(() => {
                    this.loading.set(true);
                    this.errorMessage.set(null);
                }),
                switchMap(([search, status, page]) =>
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
    }

    protected changePage(event: TablePageEvent): void {
        this.pageChanges.next(Math.floor(event.first / event.rows) + 1);
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
                        this.pageChanges.next(this.page() - 1);
                    } else {
                        this.pageChanges.next(this.page());
                    }
                },
                error: () => this.errorMessage.set('Unable to delete the product. Please try again.'),
            });
    }

    protected formatPrice(product: Product): string {
        try {
            return new Intl.NumberFormat(undefined, {
                style: 'currency',
                currency: product.currency,
            }).format(product.price);
        } catch {
            return `${product.price.toFixed(2)} ${product.currency}`;
        }
    }

    private resetToFirstPage(): void {
        if (this.pageChanges.value !== 1) {
            this.pageChanges.next(1);
        }
    }
}
