import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@env/environment';
import { Observable } from 'rxjs';

export type CustomerOrderStatus = 'NotConfirmed' | 'Confirmed' | 'InProgress' | 'DeliveryInProgress' | 'Delivered' | 'Completed' | 'Failed';

export interface CustomerOrderItem {
  id: string;
  productName: string;
  color: string;
  size: string;
  quantity: number;
  lineTotal: number;
}

export interface CustomerOrder {
  id: string;
  orderNumber: string;
  address: string;
  deliveryArea: 'InsideDhaka' | 'OutsideDhaka';
  paymentMethod: 'CashOnDelivery' | 'BanglaQr';
  status: CustomerOrderStatus;
  currency: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  createdAt: string;
  items: CustomerOrderItem[];
}

interface CustomerOrderListResponse {
  page: number;
  pageSize: number;
  totalCount: number;
  items: CustomerOrder[];
}

@Injectable({ providedIn: 'root' })
export class CustomerOrderService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/api/orders`;

  getOrders(page: number, pageSize: number): Observable<CustomerOrderListResponse> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http.get<CustomerOrderListResponse>(this.apiUrl, { params, withCredentials: true });
  }
}
