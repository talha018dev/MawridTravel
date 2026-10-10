import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { CustomerOrder, CustomerOrderService, CustomerOrderStatus } from '@app/features/orders/customer-order.service';
import { TableModule } from '@openng/optimus-ui/table';
import { TablePageEvent } from '@openng/optimus-ui/types/table';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-my-orders',
  imports: [DatePipe, TableModule],
  templateUrl: './my-orders.html',
})
export class MyOrders implements OnInit {
  private readonly service = inject(CustomerOrderService);
  protected readonly pageSize = 10;
  protected readonly orders = signal<CustomerOrder[]>([]);
  protected readonly page = signal(1);
  protected readonly totalCount = signal(0);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  protected changePage(event: TablePageEvent): void {
    this.page.set(Math.floor(event.first / event.rows) + 1);
    this.load();
  }

  protected retry(): void {
    this.load();
  }

  protected itemCount(order: CustomerOrder): number {
    return order.items.reduce((total, item) => total + item.quantity, 0);
  }
  protected formatPrice(order: CustomerOrder, amount = order.total): string {
    return order.currency === 'BDT' ? `৳ ${new Intl.NumberFormat('en-BD', { maximumFractionDigits: 2 }).format(amount)}` : `${order.currency} ${amount.toFixed(2)}`;
  }
  protected paymentLabel(order: CustomerOrder): string { return order.paymentMethod === 'BanglaQr' ? 'Paid · Bangla QR' : 'Cash on delivery'; }
  protected statusLabel(status: CustomerOrderStatus): string {
    return ({ NotConfirmed: 'Not confirmed', Confirmed: 'Confirmed', InProgress: 'Processing', DeliveryInProgress: 'Delivery in progress', Delivered: 'Delivered', Completed: 'Delivered', Failed: 'Failed' })[status];
  }
  protected statusClass(status: CustomerOrderStatus): string {
    const tone = status === 'Delivered' || status === 'Completed' ? 'bg-emerald-100 text-emerald-800' : status === 'Failed' ? 'bg-red-100 text-red-700' : status === 'DeliveryInProgress' ? 'bg-cyan-100 text-cyan-800' : status === 'InProgress' ? 'bg-violet-100 text-violet-800' : status === 'Confirmed' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800';
    return `inline-flex items-center whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-extrabold ${tone}`;
  }
  private load(): void {
    this.loading.set(true); this.errorMessage.set(null);
    this.service.getOrders(this.page(), this.pageSize).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: response => { this.orders.set(response.items); this.totalCount.set(response.totalCount); },
      error: () => this.errorMessage.set('Unable to load your orders. Please try again.'),
    });
  }
}
