import { NgOptimizedImage } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnDestroy, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '@app/features/auth/auth.service';
import { Button } from '@openng/optimus-ui/button';
import { InputOtp } from '@openng/optimus-ui/inputotp';
import { InputText } from '@openng/optimus-ui/inputtext';
import { Message } from '@openng/optimus-ui/message';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-verify-email',
  imports: [
    Button,
    InputOtp,
    InputText,
    Message,
    NgOptimizedImage,
    ReactiveFormsModule,
    RouterLink,
  ],
  templateUrl: './verify-email.html',
})
export class VerifyEmail implements OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly submitting = signal(false);
  protected readonly resending = signal(false);
  protected readonly resendCooldown = signal(0);
  protected readonly submitAttempted = signal(false);
  protected readonly message = signal<string | null>(null);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly verificationForm = new FormGroup({
    email: new FormControl(this.route.snapshot.queryParamMap.get('email') ?? '', {
      nonNullable: true,
      validators: [Validators.required, Validators.email, Validators.maxLength(256)],
    }),
    otp: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^\d{6}$/)],
    }),
  });

  protected get controls() {
    return this.verificationForm.controls;
  }

  protected verify(): void {
    this.submitAttempted.set(true);
    this.message.set(null);
    this.errorMessage.set(null);

    if (this.verificationForm.invalid) {
      this.verificationForm.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.authService
      .verifyOtp(this.verificationForm.getRawValue())
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () => void this.router.navigateByUrl('/'),
        error: () => this.errorMessage.set('The verification code is invalid. Please try again.'),
      });
  }

  protected verifyWhenOtpComplete(): void {
    if (/^\d{6}$/.test(this.controls.otp.value) && !this.submitting()) {
      this.verify();
    }
  }

  protected resend(): void {
    if (this.resending() || this.resendCooldown() > 0) return;

    this.controls.email.markAsTouched();
    this.message.set(null);
    this.errorMessage.set(null);
    if (this.controls.email.invalid) return;

    this.resending.set(true);
    this.authService
      .resendOtp(this.controls.email.value)
      .pipe(finalize(() => this.resending.set(false)))
      .subscribe({
        next: (response) => {
          this.message.set(response.message);
          this.startResendCooldown();
        },
        error: (error: HttpErrorResponse) =>
          this.errorMessage.set(
            error.status === 400
              ? 'Enter a valid email address.'
              : 'Unable to resend the code. Please try again.',
          ),
      });
  }

  private resendTimer: ReturnType<typeof setInterval> | null = null;

  private startResendCooldown(): void {
    this.resendCooldown.set(30);
    if (this.resendTimer) clearInterval(this.resendTimer);

    this.resendTimer = setInterval(() => {
      const remaining = this.resendCooldown() - 1;
      this.resendCooldown.set(Math.max(remaining, 0));

      if (remaining <= 0 && this.resendTimer) {
        clearInterval(this.resendTimer);
        this.resendTimer = null;
      }
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.resendTimer) clearInterval(this.resendTimer);
  }
}
