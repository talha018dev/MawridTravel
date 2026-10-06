import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AdminDashboardSummary, AdminService } from '@app/features/admin/data-access/admin.service';
import { ButtonDirective } from '@openng/optimus-ui/button';
import { Message } from '@openng/optimus-ui/message';

@Component({
    selector: 'app-admin-dashboard',
    imports: [ButtonDirective, Message, RouterLink],
    templateUrl: './dashboard.html',
})
export class Dashboard implements OnInit {
    private readonly adminService = inject(AdminService);
    private readonly route = inject(ActivatedRoute);

    protected readonly summary = signal<AdminDashboardSummary | null>(null);
    protected readonly loading = signal(true);
    protected readonly errorMessage = signal<string | null>(null);
    protected readonly productCreated =
        this.route.snapshot.queryParamMap.get('productCreated') === 'true';

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
