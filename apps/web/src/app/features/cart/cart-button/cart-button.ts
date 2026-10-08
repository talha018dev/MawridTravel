import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartService } from '@app/features/cart/cart.service';

@Component({
    selector: 'app-cart-button',
    imports: [RouterLink],
    templateUrl: './cart-button.html',
})
export class CartButton {
    protected readonly cart = inject(CartService);
}
