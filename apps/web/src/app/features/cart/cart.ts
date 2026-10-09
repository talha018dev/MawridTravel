import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CartItem, CartService } from '@app/features/cart/cart.service';
import { MessageService } from '@openng/optimus-ui/api';
import { ButtonDirective } from '@openng/optimus-ui/button';
import { Toast } from '@openng/optimus-ui/toast';

@Component({
    selector: 'app-cart',
    imports: [ButtonDirective, RouterLink, Toast],
    providers: [MessageService],
    templateUrl: './cart.html',
})
export class Cart {
    protected readonly cart = inject(CartService);
    private readonly messageService = inject(MessageService);
    private readonly router = inject(Router);

    protected increaseQuantity(item: CartItem): void {
        if (item.quantity >= item.stockQuantity) {
            this.messageService.add({
                severity: 'error',
                summary: 'Stock limit reached',
                detail: 'There are no more of this item available in stock.',
            });
            return;
        }

        this.cart.setQuantity(item.key, item.quantity + 1);
    }

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
