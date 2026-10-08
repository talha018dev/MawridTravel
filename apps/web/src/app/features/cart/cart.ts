import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CartItem, CartService } from '@app/features/cart/cart.service';
import { ButtonDirective } from '@openng/optimus-ui/button';
import { Tooltip } from '@openng/optimus-ui/tooltip';

@Component({
    selector: 'app-cart',
    imports: [ButtonDirective, RouterLink, Tooltip],
    templateUrl: './cart.html',
})
export class Cart {
    protected readonly cart = inject(CartService);
    private readonly router = inject(Router);

    protected proceedToCheckout(): void {
        if (this.cart.items().length === 0) return;
        void this.router.navigateByUrl('/checkout');
    }

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
