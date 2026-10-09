import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AdminOrder, OrderAdminService, OrderStatus, PaymentMethod } from '@app/features/admin/orders/order-admin.service';
import { MessageService } from '@openng/optimus-ui/api';
import { ButtonDirective } from '@openng/optimus-ui/button';
import { Toast } from '@openng/optimus-ui/toast';
import { finalize } from 'rxjs';

@Component({
    selector: 'app-order-details',
    providers: [MessageService],
    imports: [ButtonDirective, DatePipe, RouterLink, Toast],
    templateUrl: './order-details.html',
})
export class OrderDetails implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly service = inject(OrderAdminService);
    private readonly messages = inject(MessageService);
    protected readonly order = signal<AdminOrder | null>(null);
    protected readonly loading = signal(true);
    protected readonly updating = signal<'status' | 'payment' | null>(null);
    protected readonly errorMessage = signal<string | null>(null);
    protected readonly statuses: OrderStatus[] = [
        'NotConfirmed', 'Confirmed', 'InProgress', 'DeliveryInProgress', 'Delivered', 'Failed',
    ];

    ngOnInit(): void { this.load(); }

    protected updateStatus(status: OrderStatus): void {
        const order = this.order();
        if (!order || order.status === status) return;
        this.updating.set('status');
        this.service.updateStatus(order.id, status).pipe(finalize(() => this.updating.set(null))).subscribe({
            next: (updated) => {
                this.order.set(updated);
                this.messages.add({ severity: 'success', summary: 'Status updated', detail: `${updated.orderNumber} is now ${this.statusLabel(updated.status).toLowerCase()}.` });
            },
            error: (error: HttpErrorResponse) => this.messages.add({ severity: 'error', summary: 'Status not updated', detail: error.error?.errors?.status?.[0] ?? 'Unable to update the order status.' }),
        });
    }

    protected updatePayment(paymentMethod: PaymentMethod): void {
        const order = this.order();
        if (!order || order.paymentMethod === paymentMethod) return;
        this.updating.set('payment');
        this.service.updatePaymentMethod(order.id, paymentMethod).pipe(finalize(() => this.updating.set(null))).subscribe({
            next: (updated) => {
                this.order.set(updated);
                this.messages.add({ severity: 'success', summary: 'Payment updated', detail: 'The payment method has been updated.' });
            },
            error: (error: HttpErrorResponse) => this.messages.add({ severity: 'error', summary: 'Payment not updated', detail: error.error?.errors?.paymentMethod?.[0] ?? 'Unable to update the payment method.' }),
        });
    }

    protected statusLabel(status: OrderStatus): string {
        return status === 'NotConfirmed' ? 'Not confirmed'
            : status === 'InProgress' ? 'Processing'
                : status === 'DeliveryInProgress' ? 'Delivery in progress'
                    : status === 'Completed' ? 'Delivered' : status;
    }

    protected statusClass(status: OrderStatus): string {
        const tone = status === 'Delivered' || status === 'Completed' ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
            : status === 'Failed' ? 'bg-red-100 text-red-700 border-red-200'
                : status === 'DeliveryInProgress' ? 'bg-cyan-100 text-cyan-800 border-cyan-200'
                    : status === 'InProgress' ? 'bg-violet-100 text-violet-800 border-violet-200'
                        : status === 'Confirmed' ? 'bg-blue-100 text-blue-800 border-blue-200'
                            : 'bg-amber-100 text-amber-800 border-amber-200';
        return `inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-bold ${tone}`;
    }

    protected statusIcon(status: OrderStatus): string {
        return status === 'Delivered' || status === 'Completed' ? 'pi-check-circle'
            : status === 'Failed' ? 'pi-times-circle'
                : status === 'DeliveryInProgress' ? 'pi-truck'
                    : status === 'InProgress' ? 'pi-cog'
                        : status === 'Confirmed' ? 'pi-check' : 'pi-clock';
    }

    protected formatPrice(value: number): string {
        return `৳ ${new Intl.NumberFormat('en-BD', { maximumFractionDigits: 2 }).format(value)}`;
    }

    private load(): void {
        const id = this.route.snapshot.paramMap.get('id');
        if (!id) { this.errorMessage.set('Order not found.'); this.loading.set(false); return; }
        this.service.getOrder(id).pipe(finalize(() => this.loading.set(false))).subscribe({
            next: (order) => this.order.set(order),
            error: (error: HttpErrorResponse) => this.errorMessage.set(error.status === 404 ? 'Order not found.' : 'Unable to load this order. Please try again.'),
        });
    }
}
