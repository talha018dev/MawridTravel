import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '@app/features/auth/auth.service';

export const guestOnlyGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService
    .ensureSession()
    .pipe(map((user) => (user ? router.createUrlTree(['/']) : true)));
};
