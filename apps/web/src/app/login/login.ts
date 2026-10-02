import { Component, signal } from '@angular/core';
import { Button } from '@openng/optimus-ui/button';
import { Password } from '@openng/optimus-ui/password';

@Component({ selector: 'app-login', imports: [Button, Password], templateUrl: './login.html' })
export class Login {
  protected readonly loginComplete = signal(false);
  protected submitLogin(): void {
    this.loginComplete.set(true);
  }
}
