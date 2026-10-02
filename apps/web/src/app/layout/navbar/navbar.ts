import { Component, signal } from '@angular/core';
import { OpenngIcons } from '@openng/optimus-ui/api';
import { Button, ButtonDirective } from '@openng/optimus-ui/button';
import { Drawer } from '@openng/optimus-ui/drawer';
import { RouterLink } from '@angular/router';
import { Logo } from '@app/layout/logo/logo';
import { ThemeToggle } from '@app/layout/theme-toggle/theme-toggle';

@Component({
  selector: 'app-navbar',
  imports: [Button, ButtonDirective, Drawer, Logo, RouterLink, ThemeToggle],
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
