import { Component, inject, OnInit, signal } from '@angular/core';
import { finalize } from 'rxjs';
import {
  AdminDashboardSummary,
  AdminService,
} from '@app/features/admin/data-access/admin.service';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './dashboard.html',
})
export class Dashboard implements OnInit {
  private readonly adminService = inject(AdminService);

  protected readonly summary = signal<AdminDashboardSummary | null>(null);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.adminService
      .getDashboardSummary()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (summary) => this.summary.set(summary),
        error: () => this.errorMessage.set('Unable to load the dashboard summary.'),
      });
  }
}
