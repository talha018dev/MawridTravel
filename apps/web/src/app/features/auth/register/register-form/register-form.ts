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
  imports: [Button, InputText, Message, Password, ReactiveFormsModule],
  templateUrl: './register-form.html',
})
export class RegisterForm {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

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
    },
    { validators: passwordsMatch },
  );

  protected get controls() {
    return this.registerForm.controls;
  }

  protected submitRegistration(): void {
    this.submitAttempted.set(true);
    this.errorMessage.set(null);

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    const { confirmPassword: _, ...request } = this.registerForm.getRawValue();
    this.submitting.set(true);
    this.authService
      .register(request)
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (response) => {
          void this.router.navigate(['/verify-email'], {
            queryParams: { email: response.email },
          });
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
}
