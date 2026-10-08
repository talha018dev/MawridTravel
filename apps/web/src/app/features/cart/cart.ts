import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartItem, CartService } from '@app/features/cart/cart.service';
import { ButtonDirective } from '@openng/optimus-ui/button';

@Component({
    selector: 'app-cart',
    imports: [ButtonDirective, RouterLink],
    templateUrl: './cart.html',
})
export class Cart {
    protected readonly cart = inject(CartService);

    protected formatPrice(item: Pick<CartItem, 'currency' | 'price'>, value = item.price): string {
        if (item.currency.toUpperCase() === 'BDT') {
            return `৳ ${new Intl.NumberFormat('en-BD', { maximumFractionDigits: 2 }).format(value)}`;
        }

        return new Intl.NumberFormat('en-BD', {
            style: 'currency',
            currency: item.currency,
            maximumFractionDigits: 2,
        }).format(value);
    }
}
