import { Routes } from '@angular/router';
import { guestOnlyGuard } from '@app/features/auth/guest-only.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('@app/home/home').then(({ Home }) => Home),
    title: 'Mawrid Travel',
  },
  {
    path: 'login',
    canActivate: [guestOnlyGuard],
    loadComponent: () => import('@app/features/auth/login/login').then(({ Login }) => Login),
    title: 'Login | Mawrid Travel',
  },
  {
    path: 'register',
    canActivate: [guestOnlyGuard],
    loadComponent: () =>
      import('@app/features/auth/register/register').then(({ Register }) => Register),
    title: 'Create an account | Mawrid Travel',
  },
  {
    path: 'verify-email',
    canActivate: [guestOnlyGuard],
    loadComponent: () =>
      import('@app/features/auth/verify-email/verify-email').then(({ VerifyEmail }) => VerifyEmail),
    title: 'Verify email | Mawrid Travel',
  },
  {
    path: 'admin/dashboard',
    loadComponent: () =>
      import('@app/features/admin/dashboard/dashboard').then(({ Dashboard }) => Dashboard),
    title: 'Admin dashboard | Mawrid Travel',
  },
];
