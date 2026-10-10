import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '@app/features/auth/auth.service';
import { ButtonDirective } from '@openng/optimus-ui/button';
import { InputText } from '@openng/optimus-ui/inputtext';
import { Message } from '@openng/optimus-ui/message';
import { Textarea } from '@openng/optimus-ui/textarea';
import { finalize } from 'rxjs';

interface ValidationProblem { errors?: Record<string, string[]>; }

@Component({
  selector: 'app-profile',
  imports: [ButtonDirective, InputText, Message, ReactiveFormsModule, Textarea],
  templateUrl: './profile.html',
})
export class Profile implements OnInit {
  private readonly auth = inject(AuthService);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly saved = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly serverErrors = signal<Record<string, string[]>>({});
  protected readonly profileForm = new FormGroup({
    firstName: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(100)] }),
    lastName: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(100)] }),
    email: new FormControl({ value: '', disabled: true }, { nonNullable: true }),
    phoneNumber: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(30)] }),
    address: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(500)] }),
  });

  ngOnInit(): void {
    this.auth.ensureSession().pipe(finalize(() => this.loading.set(false))).subscribe(user => {
      if (!user) return;
      this.profileForm.setValue({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber ?? '',
        address: user.address ?? '',
      });
    });
  }

  protected save(): void {
    this.saved.set(false);
    this.errorMessage.set(null);
    this.serverErrors.set({});
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    const value = this.profileForm.getRawValue();
    this.saving.set(true);
    this.auth.updateProfile({
      firstName: value.firstName.trim(),
      lastName: value.lastName.trim(),
      phoneNumber: value.phoneNumber.trim() || null,
      address: value.address.trim() || null,
    }).pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.profileForm.markAsPristine();
        this.saved.set(true);
      },
      error: (error: HttpErrorResponse) => {
        const problem = error.error as ValidationProblem | null;
        if (error.status === 400 && problem?.errors) this.serverErrors.set(problem.errors);
        this.errorMessage.set(error.status === 400 ? 'Please review the highlighted fields.' : 'Unable to update your profile. Please try again.');
      },
    });
  }

  protected control(name: keyof typeof this.profileForm.controls) { return this.profileForm.controls[name]; }
}
