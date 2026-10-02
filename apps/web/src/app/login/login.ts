import { Component, signal } from '@angular/core';
import { Button } from '@openng/optimus-ui/button';
import { InputText } from '@openng/optimus-ui/inputtext';
import { Message } from '@openng/optimus-ui/message';
import { Password } from '@openng/optimus-ui/password';

@Component({
  selector: 'app-login',
  imports: [Button, InputText, Message, Password],
  templateUrl: './login.html',
})
export class Login {
  protected readonly loginComplete = signal(false);
  protected submitLogin(): void {
    this.loginComplete.set(true);
  }
}
