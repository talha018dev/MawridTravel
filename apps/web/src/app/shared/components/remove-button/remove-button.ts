import { Component, input, output } from '@angular/core';
import { ButtonDirective } from '@openng/optimus-ui/button';

@Component({
    selector: 'app-remove-button',
    imports: [ButtonDirective],
    templateUrl: './remove-button.html',
    host: { class: 'inline-flex' },
})
export class RemoveButton {
    readonly ariaLabel = input('Remove');
    readonly disabled = input(false);
    readonly removed = output<MouseEvent>();
}
