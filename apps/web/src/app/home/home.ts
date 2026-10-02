import { Component } from '@angular/core';
import { ButtonDirective } from '@openng/optimus-ui/button';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  imports: [ButtonDirective, RouterLink],
  templateUrl: './home.html',
})
export class Home {}
