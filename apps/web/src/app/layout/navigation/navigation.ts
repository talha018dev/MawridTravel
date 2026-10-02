import { Component, input, output } from '@angular/core';
import { ButtonDirective } from '@openng/optimus-ui/button';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-navigation',
  imports: [ButtonDirective, RouterLink],
  templateUrl: './navigation.html',
})
export class Navigation {
  readonly drawer = input(false);
  readonly navigated = output<void>();

  protected closeDrawer(): void {
    this.navigated.emit();
  }
}
