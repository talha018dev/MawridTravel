import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-back-to-products-button',
    imports: [RouterLink],
    host: { class: 'inline-flex' },
    templateUrl: './back-to-products-button.html',
})
export class BackToProductsButton {}
