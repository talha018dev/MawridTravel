import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@env/environment';
import { Observable } from 'rxjs';

export interface CheckoutRequest {
    fullName: string;
    phone: string;
    email: string | null;
    address: string;
    deliveryArea: 'InsideDhaka' | 'OutsideDhaka';
    paymentMethod: 'CashOnDelivery';
    items: Array<{
        productId: string;
        colorOptionValueId: string;
        sizeOptionValueId: string;
        quantity: number;
    }>;
}

export interface CheckoutOrder {
    id: string;
    orderNumber: string;
    status: string;
    subtotal: number;
    deliveryFee: number;
    total: number;
    currency: string;
}

@Injectable({ providedIn: 'root' })
export class CheckoutService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = `${environment.apiBaseUrl}/api/checkout`;

    checkout(request: CheckoutRequest, idempotencyKey: string): Observable<CheckoutOrder> {
        return this.http.post<CheckoutOrder>(this.apiUrl, request, {
            headers: { 'Idempotency-Key': idempotencyKey },
            withCredentials: true,
        });
    }
}
