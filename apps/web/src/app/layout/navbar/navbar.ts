import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { OpenngIcons } from '@openng/optimus-ui/api';
import { Button } from '@openng/optimus-ui/button';
import { Drawer } from '@openng/optimus-ui/drawer';
import { Logo } from '@app/layout/logo/logo';
import { Navigation } from '@app/layout/navigation/navigation';
import { ThemeToggle } from '@app/layout/theme-toggle/theme-toggle';
import { CartButton } from '@app/features/cart/cart-button/cart-button';
import { filter, map } from 'rxjs';

function isAuthenticationPage(url: string): boolean {
  const path = url.split(/[?#]/, 1)[0];
  return path === '/login' || path === '/register';
}

@Component({
  selector: 'app-navbar',
  imports: [Button, CartButton, Drawer, Logo, Navigation, ThemeToggle],
  templateUrl: './navbar.html',
  host: { class: 'sticky top-0 z-50 block' },
})
export class Navbar {
  private readonly router = inject(Router);
  protected readonly mobileMenuOpen = signal(false);
  protected readonly menuIcon = OpenngIcons.BARS;
  protected readonly hideAccountAndCart = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => isAuthenticationPage(event.urlAfterRedirects)),
    ),
    { initialValue: isAuthenticationPage(this.router.url) },
  );

  protected closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }
}
