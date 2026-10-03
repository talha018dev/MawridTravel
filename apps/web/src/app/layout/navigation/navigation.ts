import { Component, inject, input, output, signal } from '@angular/core';
import { ButtonDirective } from '@openng/optimus-ui/button';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@app/features/auth/auth.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-navigation',
  imports: [ButtonDirective, RouterLink],
  templateUrl: './navigation.html',
})
export class Navigation {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly drawer = input(false);
  readonly navigated = output<void>();
  protected readonly authenticated = this.authService.authenticated;
  protected readonly loggingOut = signal(false);

  constructor() {
    this.authService.ensureSession().subscribe();
  }

  protected closeDrawer(): void {
    this.navigated.emit();
  }

  protected logout(): void {
    if (this.loggingOut()) return;

    this.loggingOut.set(true);
    this.authService
      .logout()
      .pipe(finalize(() => this.loggingOut.set(false)))
      .subscribe({
        next: () => {
          this.closeDrawer();
          void this.router.navigateByUrl('/');
        },
      });
  }
}
