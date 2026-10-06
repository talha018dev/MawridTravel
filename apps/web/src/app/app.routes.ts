import { Routes } from '@angular/router';
import { adminGuard } from '@app/features/admin/admin.guard';
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
    path: 'admin',
    canActivate: [adminGuard],
    canActivateChild: [adminGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('@app/features/admin/dashboard/dashboard').then(({ Dashboard }) => Dashboard),
        title: 'Admin dashboard | Mawrid Travel',
      },
      {
        path: 'products/new',
        loadComponent: () =>
          import('@app/features/admin/products/product-create/product-create').then(
            ({ ProductCreate }) => ProductCreate,
          ),
        title: 'Create product | Mawrid Travel',
      },
    ],
  },
];
