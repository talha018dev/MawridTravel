import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface AdminDashboardSummary {
    totalUsers: number;
    totalCustomers: number;
    totalAdmins: number;
    newCustomersLast30Days: number;
    totalOrders: number;
    ordersLast24Hours: number;
    awaitingConfirmation: number;
    activeFulfilment: number;
    deliveredOrders: number;
    unpaidBanglaQr: number;
    collectedRevenue: number;
    openOrderValue: number;
    totalProducts: number;
    activeProducts: number;
    lowStockProducts: number;
    outOfStockProducts: number;
    publishedBlogs: number;
    recentOrders: AdminDashboardOrder[];
}

export interface AdminDashboardOrder {
    id: string;
    orderNumber: string;
    customerName: string;
    status: string;
    paymentMethod: string;
    total: number;
    currency: string;
    createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = `${environment.apiBaseUrl}/api/admin`;

    getDashboardSummary(): Observable<AdminDashboardSummary> {
        return this.http.get<AdminDashboardSummary>(`${this.apiUrl}/dashboard`, {
            withCredentials: true,
        });
    }
}
