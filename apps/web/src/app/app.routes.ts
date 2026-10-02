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
    title: 'Log in | Mawrid Travel',
  },
];
