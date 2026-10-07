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
        path: 'blog',
        loadComponent: () =>
          import('@app/features/admin/blogs/blog-list/blog-list').then(
            ({ BlogList }) => BlogList,
          ),
        title: 'Blogs | Mawrid Travel',
      },
      {
        path: 'products/list',
        loadComponent: () =>
          import('@app/features/admin/products/product-list/product-list').then(
            ({ ProductList }) => ProductList,
          ),
        title: 'Products | Mawrid Travel',
      },
      {
        path: 'products',
        pathMatch: 'full',
        redirectTo: 'products/list',
      },
      {
        path: 'products/new',
        loadComponent: () =>
          import('@app/features/admin/products/product-create/product-create').then(
            ({ ProductCreate }) => ProductCreate,
          ),
        title: 'Create product | Mawrid Travel',
      },
      {
        path: 'products/:id/edit',
        loadComponent: () =>
          import('@app/features/admin/products/product-edit/product-edit').then(
            ({ ProductEdit }) => ProductEdit,
          ),
        title: 'Edit product | Mawrid Travel',
      },
      {
        path: 'products/:id',
        loadComponent: () =>
          import('@app/features/admin/products/product-details/product-details').then(
            ({ ProductDetails }) => ProductDetails,
          ),
        title: 'Product details | Mawrid Travel',
      },
    ],
  },
];
