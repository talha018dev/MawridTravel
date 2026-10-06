import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface AdminDashboardSummary {
    totalUsers: number;
    totalCustomers: number;
    totalAdmins: number;
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
