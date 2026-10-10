import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminOrder, OrderAdminService, OrderStatus, PaymentMethod } from '@app/features/admin/orders/order-admin.service';
import { MessageService } from '@openng/optimus-ui/api';
import { IconField } from '@openng/optimus-ui/iconfield';
import { InputIcon } from '@openng/optimus-ui/inputicon';
import { InputText } from '@openng/optimus-ui/inputtext';
import { Popover } from '@openng/optimus-ui/popover';
import { Select } from '@openng/optimus-ui/select';
import { TableModule } from '@openng/optimus-ui/table';
import { TablePageEvent } from '@openng/optimus-ui/types/table';
import { Toast } from '@openng/optimus-ui/toast';
import { debounceTime, distinctUntilChanged, finalize } from 'rxjs';

@Component({
    selector: 'app-order-list',
    providers: [MessageService],
    imports: [DatePipe, IconField, InputIcon, InputText, Popover, ReactiveFormsModule, RouterLink, Select, TableModule, Toast],
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
        { label: 'Delivery in progress', value: 'DeliveryInProgress' },
        { label: 'Delivered', value: 'Delivered' },
        { label: 'Failed', value: 'Failed' },
    ];
    ngOnInit(): void {
        this.searchControl.valueChanges.pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef)).subscribe(() => { this.page.set(1); this.load(); });
        this.statusControl.valueChanges.pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef)).subscribe(() => { this.page.set(1); this.load(); });
        this.load();
    }

    protected changePage(event: TablePageEvent): void { this.page.set(Math.floor(event.first / event.rows) + 1); this.load(); }

    protected availableStatuses(order: AdminOrder): OrderStatus[] {
        return (['NotConfirmed', 'Confirmed', 'InProgress', 'DeliveryInProgress', 'Delivered', 'Failed'] as OrderStatus[])
            .filter((status) => status !== order.status);
    }

    protected updateStatus(order: AdminOrder, status: OrderStatus): void {
        if (status === order.status) return;
        this.updatingId.set(order.id);
        this.service.updateStatus(order.id, status).pipe(finalize(() => this.updatingId.set(null))).subscribe({
            next: (updated) => {
                this.messages.add({ severity: 'success', summary: 'Order updated', detail: `${updated.orderNumber} is now ${this.statusLabel(updated.status).toLowerCase()}.` });

                const activeStatus = this.statusControl.value;
                if (activeStatus !== 'all' && activeStatus !== updated.status) {
                    const remainingTotal = Math.max(0, this.totalCount() - 1);
                    if (this.page() > 1 && (this.page() - 1) * this.pageSize >= remainingTotal) {
                        this.page.update((page) => page - 1);
                    }
                    this.load();
                    return;
                }

                this.orders.update((orders) => orders.map((item) => item.id === updated.id ? updated : item));
            },
            error: (error: HttpErrorResponse) => this.messages.add({ severity: 'error', summary: 'Status not updated', detail: error.error?.errors?.status?.[0] ?? 'Unable to update the order status.' }),
        });
    }

    protected statusLabel(status: OrderStatus): string {
        return status === 'NotConfirmed' ? 'Not confirmed'
            : status === 'InProgress' ? 'Processing'
                : status === 'DeliveryInProgress' ? 'Delivery in progress'
                    : status === 'Completed' ? 'Delivered' : status;
    }

    protected statusBadgeClass(status: OrderStatus): string {
        const tone = status === 'Delivered' || status === 'Completed' ? 'bg-emerald-100 text-emerald-800'
            : status === 'Failed' ? 'bg-red-100 text-red-700'
                : status === 'DeliveryInProgress' ? 'bg-cyan-100 text-cyan-800'
                    : status === 'InProgress' ? 'bg-violet-100 text-violet-800'
                    : status === 'Confirmed' ? 'bg-blue-100 text-blue-800'
                        : 'bg-amber-100 text-amber-800';
        return `inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-extrabold ${tone}`;
    }

    protected statusIcon(status: OrderStatus): string {
        return status === 'Delivered' || status === 'Completed' ? 'pi-check-circle'
            : status === 'Failed' ? 'pi-times-circle'
                : status === 'DeliveryInProgress' ? 'pi-truck'
                : status === 'InProgress' ? 'pi-cog'
                    : status === 'Confirmed' ? 'pi-check' : 'pi-clock';
    }

    protected statusActionClass(status: OrderStatus): string {
        const tone = status === 'Delivered' || status === 'Completed' ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            : status === 'Failed' ? 'bg-red-50 text-red-700 hover:bg-red-100'
                : status === 'DeliveryInProgress' ? 'bg-cyan-50 text-cyan-800 hover:bg-cyan-100'
                    : status === 'InProgress' ? 'bg-violet-50 text-violet-800 hover:bg-violet-100'
                        : status === 'Confirmed' ? 'bg-blue-50 text-blue-800 hover:bg-blue-100'
                            : 'bg-amber-50 text-amber-800 hover:bg-amber-100';
        return `flex w-full cursor-pointer items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${tone}`;
    }

    protected statusFilterClass(status: OrderStatus): string {
        const tone = status === 'Delivered' || status === 'Completed' ? 'text-emerald-700'
            : status === 'Failed' ? 'text-red-700'
                : status === 'DeliveryInProgress' ? 'text-cyan-700'
                    : status === 'InProgress' ? 'text-violet-700'
                        : status === 'Confirmed' ? 'text-blue-700' : 'text-amber-700';
        return `flex w-full items-center gap-2 px-2 py-1 text-sm font-bold ${tone}`;
    }

    protected statusActionLabel(status: OrderStatus): string {
        return status === 'NotConfirmed' ? 'Not Confirmed'
            : status === 'Confirmed' ? 'Confirmed'
                : status === 'InProgress' ? 'Processing'
                    : status === 'DeliveryInProgress' ? 'Delivery in Progress'
                        : status === 'Delivered' ? 'Delivered' : 'Failed';
    }

    protected formatPrice(value: number): string { return `৳ ${new Intl.NumberFormat('en-BD', { maximumFractionDigits: 2 }).format(value)}`; }

    protected paymentLabel(paymentMethod: PaymentMethod): string {
        return paymentMethod === 'BanglaQr' ? 'Paid · Bangla QR' : 'Payment due · Cash on delivery';
    }

    protected updatePaymentMethod(order: AdminOrder, paymentMethod: PaymentMethod): void {
        if (paymentMethod === order.paymentMethod) return;
        this.updatingId.set(order.id);
        this.service.updatePaymentMethod(order.id, paymentMethod).pipe(finalize(() => this.updatingId.set(null))).subscribe({
            next: (updated) => {
                this.orders.update((orders) => orders.map((item) => item.id === updated.id ? updated : item));
                this.messages.add({ severity: 'success', summary: 'Payment updated', detail: `${updated.orderNumber} is marked as ${paymentMethod === 'BanglaQr' ? 'paid by Bangla QR' : 'cash on delivery'}.` });
            },
            error: (error: HttpErrorResponse) => this.messages.add({ severity: 'error', summary: 'Payment not updated', detail: error.error?.errors?.paymentMethod?.[0] ?? 'Unable to update the payment method.' }),
        });
    }

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
