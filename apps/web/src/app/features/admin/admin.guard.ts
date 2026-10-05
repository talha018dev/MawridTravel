import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '@app/features/auth/auth.service';

const authorizeAdmin = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.ensureSession().pipe(
    map((user) => {
      if (!user) {
        return router.createUrlTree(['/login']);
      }

      return user.roles.includes('Admin') ? true : router.createUrlTree(['/']);
    }),
  );
};

export const adminGuard: CanActivateFn & CanActivateChildFn = authorizeAdmin;
