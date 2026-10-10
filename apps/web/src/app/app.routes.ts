import { Routes } from '@angular/router';
import { adminGuard } from '@app/features/admin/admin.guard';
import { guestOnlyGuard } from '@app/features/auth/guest-only.guard';
import { authGuard } from '@app/features/auth/auth.guard';

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
    path: 'shop',
    loadComponent: () =>
      import('@app/features/shop/product-catalog').then(
        ({ ProductCatalog }) => ProductCatalog,
      ),
    title: 'Travel essentials shop | Mawrid Travel',
  },
  {
    path: 'shop/:slug',
    loadComponent: () =>
      import('@app/features/shop/product-details/product-details').then(
        ({ ProductDetails }) => ProductDetails,
      ),
    title: 'Product | Mawrid Travel',
  },
  {
    path: 'cart',
    loadComponent: () => import('@app/features/cart/cart').then(({ Cart }) => Cart),
    title: 'Shopping cart | Mawrid Travel',
  },
  {
    path: 'checkout',
    loadComponent: () => import('@app/features/checkout/checkout').then(({ Checkout }) => Checkout),
    title: 'Checkout | Mawrid Travel',
  },
  {
    path: 'tickets',
    loadComponent: () => import('@app/features/tickets/tickets').then(({ Tickets }) => Tickets),
    title: 'Flight Tickets | Mawrid Travel',
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () => import('@app/features/profile/profile').then(({ Profile }) => Profile),
    title: 'Profile | Mawrid Travel',
  },
  {
    path: 'my-orders',
    canActivate: [authGuard],
    loadComponent: () => import('@app/features/orders/my-orders/my-orders').then(({ MyOrders }) => MyOrders),
    title: 'My Orders | Mawrid Travel',
  },
  {
    path: 'terms-and-use',
    loadComponent: () => import('@app/features/static-pages/terms/terms').then(({ Terms }) => Terms),
    title: 'Terms of Use | Mawrid Travel',
  },
  {
    path: 'privacy',
    loadComponent: () => import('@app/features/static-pages/privacy/privacy').then(({ Privacy }) => Privacy),
    title: 'Privacy Policy | Mawrid Travel',
  },
  {
    path: 'faq',
    loadComponent: () => import('@app/features/static-pages/faq/faq').then(({ Faq }) => Faq),
    title: 'Frequently Asked Questions | Mawrid Travel',
  },
  {
    path: 'blogs',
    loadComponent: () =>
      import('@app/features/blogs/blog-list/blog-list').then(
        ({ PublicBlogList }) => PublicBlogList,
      ),
    title: 'Travel Blog | Mawrid Travel',
  },
  {
    path: 'blogs/:slug',
    loadComponent: () =>
      import('@app/features/blogs/blog-details/blog-details').then(
        ({ PublicBlogDetails }) => PublicBlogDetails,
      ),
    title: 'Travel Article | Mawrid Travel',
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
        path: 'orders',
        loadComponent: () =>
          import('@app/features/admin/orders/order-list/order-list').then(
            ({ OrderList }) => OrderList,
          ),
        title: 'Orders | Mawrid Travel',
      },
      {
        path: 'orders/:id',
        loadComponent: () =>
          import('@app/features/admin/orders/order-details/order-details').then(
            ({ OrderDetails }) => OrderDetails,
          ),
        title: 'Order details | Mawrid Travel',
      },
      {
        path: 'blog/new',
        loadComponent: () =>
          import('@app/features/admin/blogs/blog-create/blog-create').then(
            ({ BlogCreate }) => BlogCreate,
          ),
        title: 'Create blog | Mawrid Travel',
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
        path: 'blog/:id/edit',
        loadComponent: () =>
          import('@app/features/admin/blogs/blog-edit/blog-edit').then(
            ({ BlogEdit }) => BlogEdit,
          ),
        title: 'Edit blog | Mawrid Travel',
      },
      {
        path: 'blog/:id',
        loadComponent: () =>
          import('@app/features/admin/blogs/blog-details/blog-details').then(
            ({ BlogDetails }) => BlogDetails,
          ),
        title: 'Blog details | Mawrid Travel',
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
