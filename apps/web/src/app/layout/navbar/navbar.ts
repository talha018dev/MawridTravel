import { Component } from '@angular/core';
import { ButtonDirective } from '@openng/optimus-ui/button';
import { RouterLink } from '@angular/router';
import { Logo } from '../logo/logo';
import { ThemeToggle } from '../theme-toggle/theme-toggle';

@Component({
  selector: 'app-navbar',
  imports: [ButtonDirective, Logo, RouterLink, ThemeToggle],
  templateUrl: './navbar.html',
})
export class Navbar {}
