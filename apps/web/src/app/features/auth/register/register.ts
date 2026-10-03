import { NgOptimizedImage } from '@angular/common';
import { Component } from '@angular/core';
import { RegisterForm } from '@app/features/auth/register/register-form/register-form';

@Component({
  selector: 'app-register',
  imports: [NgOptimizedImage, RegisterForm],
  templateUrl: './register.html',
})
export class Register {}
