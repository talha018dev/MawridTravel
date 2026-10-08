import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@env/environment';
import { Observable } from 'rxjs';

export type OrderStatus = 'NotConfirmed' | 'Confirmed' | 'InProgress' | 'Completed' | 'Failed';

export interface AdminOrderItem {
    id: string;
    productName: string;
    color: string;
    size: string;
    quantity: number;
    lineTotal: number;
}

export interface AdminOrder {
    id: string;
    orderNumber: string;
    fullName: string;
    phone: string;
    email: string | null;
    address: string;
    paymentMethod: string;
    status: OrderStatus;
    currency: string;
    subtotal: number;
    deliveryFee: number;
    total: number;
    createdAt: string;
    updatedAt: string;
    items: AdminOrderItem[];
}

export interface AdminOrderListResponse {
    page: number;
    pageSize: number;
    totalCount: number;
    items: AdminOrder[];
}

@Injectable({ providedIn: 'root' })
export class OrderAdminService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = `${environment.apiBaseUrl}/api/admin/orders`;

    getOrders(search: string, status: string, page: number, pageSize: number): Observable<AdminOrderListResponse> {
        let params = new HttpParams().set('page', page).set('pageSize', pageSize);
        if (search) params = params.set('search', search);
        if (status !== 'all') params = params.set('status', status);
        return this.http.get<AdminOrderListResponse>(this.apiUrl, { params, withCredentials: true });
    }

    updateStatus(id: string, status: OrderStatus): Observable<AdminOrder> {
        return this.http.patch<AdminOrder>(`${this.apiUrl}/${id}/status`, { status }, { withCredentials: true });
    }
}
