import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '@app/features/auth/auth.service';
import { Button } from '@openng/optimus-ui/button';
import { InputText } from '@openng/optimus-ui/inputtext';
import { InputOtp } from '@openng/optimus-ui/inputotp';
import { Message } from '@openng/optimus-ui/message';
import { Password } from '@openng/optimus-ui/password';
import { finalize } from 'rxjs';

function passwordsMatch(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;
  return password === confirmPassword ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-register-form',
  imports: [Button, InputOtp, InputText, Message, Password, ReactiveFormsModule],
  templateUrl: './register-form.html',
})
export class RegisterForm {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly verificationEmail = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly submitAttempted = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly registerForm = new FormGroup(
    {
      firstName: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.maxLength(100)],
      }),
      lastName: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.maxLength(100)],
      }),
      email: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.email, Validators.maxLength(256)],
      }),
      password: new FormControl('', {
        nonNullable: true,
        validators: [
          Validators.required,
          Validators.minLength(8),
          Validators.maxLength(128),
          Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/),
        ],
      }),
      confirmPassword: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required],
      }),
      otp: new FormControl(
        { value: '', disabled: true },
        {
          nonNullable: true,
          validators: [Validators.required, Validators.pattern(/^\d{6}$/)],
        },
      ),
    },
    { validators: passwordsMatch },
  );

  protected get controls() {
    return this.registerForm.controls;
  }

  protected submitRegistration(): void {
    this.submitAttempted.set(true);
    this.errorMessage.set(null);

    const verificationEmail = this.verificationEmail();
    if (verificationEmail) {
      this.submitOtp(verificationEmail);
      return;
    }

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    const { confirmPassword: _, otp: __, ...request } = this.registerForm.getRawValue();
    this.submitting.set(true);
    this.authService
      .register(request)
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (response) => {
          this.verificationEmail.set(response.email);
          this.controls.otp.enable();
          this.submitAttempted.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            error.status === 400
              ? 'Please review your details and try again.'
              : 'Unable to create your account. Please try again.',
          );
        },
      });
  }

  private submitOtp(email: string): void {
    this.controls.otp.markAsTouched();
    if (this.controls.otp.invalid) return;

    this.submitting.set(true);
    this.authService
      .verifyOtp({ email, otp: this.controls.otp.value })
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () => void this.router.navigateByUrl('/'),
        error: () => this.errorMessage.set('The verification code is invalid. Please try again.'),
      });
  }
}
