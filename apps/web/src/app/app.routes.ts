import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('@app/home/home').then(({ Home }) => Home),
    title: 'Mawrid Travel',
  },
  {
    path: 'login',
    loadComponent: () => import('@app/features/auth/login/login').then(({ Login }) => Login),
    title: 'Login | Mawrid Travel',
  },
  {
    path: 'register',
    loadComponent: () =>
      import('@app/features/auth/register/register').then(({ Register }) => Register),
    title: 'Create an account | Mawrid Travel',
  },
  {
    path: 'admin/dashboard',
    loadComponent: () =>
      import('@app/features/admin/dashboard/dashboard').then(({ Dashboard }) => Dashboard),
    title: 'Admin dashboard | Mawrid Travel',
  },
];
