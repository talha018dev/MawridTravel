import { NgOptimizedImage } from '@angular/common';
import { Component } from '@angular/core';
import { LoginForm } from '@app/features/auth/login/login-form/login-form';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [LoginForm, NgOptimizedImage],
  templateUrl: './login.html',
})
export class Login {}
