import { Component, signal } from '@angular/core';
import { OpenngIcons } from '@openng/optimus-ui/api';
import { Button } from '@openng/optimus-ui/button';
import { Drawer } from '@openng/optimus-ui/drawer';
import { Logo } from '@app/layout/logo/logo';
import { Navigation } from '@app/layout/navigation/navigation';
import { ThemeToggle } from '@app/layout/theme-toggle/theme-toggle';
import { CartButton } from '@app/features/cart/cart-button/cart-button';

@Component({
  selector: 'app-navbar',
  imports: [Button, CartButton, Drawer, Logo, Navigation, ThemeToggle],
  templateUrl: './navbar.html',
  host: { class: 'sticky top-0 z-50 block' },
})
export class Navbar {
  protected readonly mobileMenuOpen = signal(false);
  protected readonly menuIcon = OpenngIcons.BARS;

  protected closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }
}
