import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AdminOrder, OrderAdminService, OrderStatus } from '@app/features/admin/orders/order-admin.service';
import { MessageService } from '@openng/optimus-ui/api';
import { IconField } from '@openng/optimus-ui/iconfield';
import { InputIcon } from '@openng/optimus-ui/inputicon';
import { InputText } from '@openng/optimus-ui/inputtext';
import { Select } from '@openng/optimus-ui/select';
import { SelectChangeEvent } from '@openng/optimus-ui/types/select';
import { TableModule } from '@openng/optimus-ui/table';
import { TablePageEvent } from '@openng/optimus-ui/types/table';
import { Toast } from '@openng/optimus-ui/toast';
import { debounceTime, distinctUntilChanged, finalize } from 'rxjs';

@Component({
    selector: 'app-order-list',
    providers: [MessageService],
    imports: [DatePipe, FormsModule, IconField, InputIcon, InputText, ReactiveFormsModule, Select, TableModule, Toast],
    templateUrl: './order-list.html',
})
export class OrderList implements OnInit {
    private readonly service = inject(OrderAdminService);
    private readonly messages = inject(MessageService);
    private readonly destroyRef = inject(DestroyRef);
    protected readonly pageSize = 20;
    protected readonly searchControl = new FormControl('', { nonNullable: true });
    protected readonly statusControl = new FormControl('all', { nonNullable: true });
    protected readonly orders = signal<AdminOrder[]>([]);
    protected readonly page = signal(1);
    protected readonly totalCount = signal(0);
    protected readonly loading = signal(true);
    protected readonly updatingId = signal<string | null>(null);
    protected readonly errorMessage = signal<string | null>(null);
    protected readonly filterOptions = [
        { label: 'All statuses', value: 'all' },
        { label: 'Not confirmed', value: 'NotConfirmed' },
        { label: 'Confirmed', value: 'Confirmed' },
        { label: 'In progress', value: 'InProgress' },
        { label: 'Completed', value: 'Completed' },
        { label: 'Failed', value: 'Failed' },
    ];

    ngOnInit(): void {
        this.searchControl.valueChanges.pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef)).subscribe(() => { this.page.set(1); this.load(); });
        this.statusControl.valueChanges.pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef)).subscribe(() => { this.page.set(1); this.load(); });
        this.load();
    }

    protected changePage(event: TablePageEvent): void { this.page.set(Math.floor(event.first / event.rows) + 1); this.load(); }

    protected statusOptions(order: AdminOrder) {
        const next = order.status === 'NotConfirmed' ? ['Confirmed', 'Failed']
            : order.status === 'Confirmed' ? ['InProgress', 'Failed']
                : order.status === 'InProgress' ? ['Completed', 'Failed'] : [];
        return [order.status, ...next].map((value) => ({ label: this.statusLabel(value as OrderStatus), value }));
    }

    protected updateStatus(order: AdminOrder, event: SelectChangeEvent): void {
        const status = event.value as OrderStatus;
        if (status === order.status) return;
        this.updatingId.set(order.id);
        this.service.updateStatus(order.id, status).pipe(finalize(() => this.updatingId.set(null))).subscribe({
            next: (updated) => {
                this.orders.update((orders) => orders.map((item) => item.id === updated.id ? updated : item));
                this.messages.add({ severity: 'success', summary: 'Order updated', detail: `${updated.orderNumber} is now ${this.statusLabel(updated.status).toLowerCase()}.` });
            },
            error: (error: HttpErrorResponse) => this.messages.add({ severity: 'error', summary: 'Status not updated', detail: error.error?.errors?.status?.[0] ?? 'Unable to update the order status.' }),
        });
    }

    protected statusLabel(status: OrderStatus): string {
        return status === 'NotConfirmed' ? 'Not confirmed' : status === 'InProgress' ? 'In progress' : status;
    }

    protected formatPrice(value: number): string { return `৳ ${new Intl.NumberFormat('en-BD', { maximumFractionDigits: 2 }).format(value)}`; }

    private load(): void {
        this.loading.set(true);
        this.errorMessage.set(null);
        this.service.getOrders(this.searchControl.value.trim(), this.statusControl.value, this.page(), this.pageSize)
            .pipe(finalize(() => this.loading.set(false)))
            .subscribe({
                next: (response) => { this.orders.set(response.items); this.totalCount.set(response.totalCount); },
                error: () => this.errorMessage.set('Unable to load orders. Please try again.'),
            });
    }
}
