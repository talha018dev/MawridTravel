import { Component, computed, inject, input, output, signal } from '@angular/core';
import { Avatar } from '@openng/optimus-ui/avatar';
import { ButtonDirective } from '@openng/optimus-ui/button';
import { Popover } from '@openng/optimus-ui/popover';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '@app/features/auth/auth.service';
import { ThemeToggle } from '@app/layout/theme-toggle/theme-toggle';
import { finalize } from 'rxjs';
import { CartButton } from '@app/features/cart/cart-button/cart-button';

const ADMIN_MENU_ITEMS = [
    { label: 'Dashboard', path: '/admin/dashboard', icon: 'pi pi-home' },
    { label: 'Products', path: '/admin/products/list', icon: 'pi pi-box' },
    { label: 'Orders', path: '/admin/orders', icon: 'pi pi-shopping-cart' },
    { label: 'Manage Blogs', path: '/admin/blog', icon: 'pi pi-file-edit' },
] as const;

const PUBLIC_MENU_ITEMS = [
    { label: 'Home', path: '/', icon: 'pi pi-home' },
    { label: 'Shop', path: '/shop', icon: 'pi pi-shopping-bag' },
    { label: 'Travel Blog', path: '/blogs', icon: 'pi pi-book' },
    { label: 'Tickets', path: '/tickets', icon: 'pi pi-ticket' },
] as const;

@Component({
    selector: 'app-navigation',
  imports: [Avatar, ButtonDirective, CartButton, Popover, RouterLink, RouterLinkActive, ThemeToggle],
    templateUrl: './navigation.html',
})
export class Navigation {
    private readonly authService = inject(AuthService);
    private readonly router = inject(Router);

    readonly drawer = input(false);
    readonly showMenu = input(true);
    readonly showAccount = input(true);
    readonly showCart = input(true);
    readonly showThemeToggle = input(false);
    readonly navigated = output<void>();
    protected readonly authenticated = this.authService.authenticated;
    protected readonly admin = computed(
        () => this.authService.user()?.roles.includes('Admin') ?? false,
    );
    protected readonly adminMenuItems = ADMIN_MENU_ITEMS;
    protected readonly publicMenuItems = PUBLIC_MENU_ITEMS;
    protected readonly menuItems = computed(() =>
        this.admin()
            ? [...this.adminMenuItems, ...this.publicMenuItems]
            : this.publicMenuItems,
    );
    protected readonly loggingOut = signal(false);
    private logoutWhenAccountMenuCloses = false;
    protected readonly userInitials = computed(() => {
        const user = this.authService.user();

        if (!user) return '';

        return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
    });

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

    protected logoutFromAccountMenu(accountMenu: Popover): void {
        if (this.loggingOut() || this.logoutWhenAccountMenuCloses) return;

        this.logoutWhenAccountMenuCloses = true;
        accountMenu.hide();
    }

    protected accountMenuHidden(): void {
        if (!this.logoutWhenAccountMenuCloses) return;

        this.logoutWhenAccountMenuCloses = false;
        this.logout();
    }
}
