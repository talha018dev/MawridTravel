import { Component, computed, inject, input, output, signal } from '@angular/core';
import { ButtonDirective } from '@openng/optimus-ui/button';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@app/features/auth/auth.service';
import { finalize } from 'rxjs';

const ADMIN_MENU_ITEMS = [
  { label: 'Dashboard', path: '/admin/dashboard' },
  { label: 'Products', path: '/admin/products/list' },
  { label: 'Orders', path: '/admin/orders' },
  { label: 'Blog', path: '/admin/blog' },
] as const;

const PUBLIC_MENU_ITEMS = [
  { label: 'Home', path: '/' },
  { label: 'Book tickets', path: '/tickets' },
  { label: 'Journal', path: '/journal' },
  { label: 'Shop', path: '/shop' },
] as const;

@Component({
  selector: 'app-navigation',
  imports: [ButtonDirective, RouterLink],
  templateUrl: './navigation.html',
})
export class Navigation {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly drawer = input(false);
  readonly navigated = output<void>();
  protected readonly authenticated = this.authService.authenticated;
  protected readonly admin = computed(
    () => this.authService.user()?.roles.includes('Admin') ?? false,
  );
  protected readonly adminMenuItems = ADMIN_MENU_ITEMS;
  protected readonly publicMenuItems = PUBLIC_MENU_ITEMS;
  protected readonly loggingOut = signal(false);

  constructor() {
    this.authService.ensureSession().subscribe();
  }

  protected closeDrawer(): void {
    this.navigated.emit();
  }

  protected logout(): void {
    if (this.loggingOut()) return;

    this.loggingOut.set(true);
    this.authService
      .logout()
      .pipe(finalize(() => this.loggingOut.set(false)))
      .subscribe({
        next: () => {
          this.closeDrawer();
          void this.router.navigateByUrl('/');
        },
      });
  }
}
