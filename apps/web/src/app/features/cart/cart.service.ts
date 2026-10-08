import { isPlatformBrowser } from '@angular/common';
import { afterNextRender, computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import {
    CatalogProduct,
    CatalogProductOptionValue,
} from '@app/features/shop/product-catalog.service';

export interface CartItem {
    key: string;
    productId: string;
    slug: string;
    name: string;
    imageUrl: string | null;
    imageAlt: string;
    price: number;
    currency: string;
    stockQuantity: number;
    color: CatalogProductOptionValue;
    size: CatalogProductOptionValue;
    quantity: number;
}

const CART_STORAGE_KEY = 'mawrid.cart.v1';
export type AddToCartResult = 'added' | 'stock-limit' | 'unavailable';

@Injectable({ providedIn: 'root' })
export class CartService {
    private readonly platformId = inject(PLATFORM_ID);
    private readonly cartItems = signal<CartItem[]>([]);

    readonly items = this.cartItems.asReadonly();
    readonly itemCount = computed(() =>
        this.cartItems().reduce((total, item) => total + item.quantity, 0),
    );
    readonly subtotal = computed(() =>
        this.cartItems().reduce((total, item) => total + item.price * item.quantity, 0),
    );

    constructor() {
        afterNextRender(() => this.cartItems.set(this.readStoredCart()));
    }

    add(
        product: CatalogProduct,
        color: CatalogProductOptionValue,
        size: CatalogProductOptionValue,
        quantity = 1,
    ): AddToCartResult {
        const key = this.createKey(product.id, color.id, size.id);
        const existingItem = this.cartItems().find((item) => item.key === key);

        if (existingItem) {
            if (existingItem.quantity >= product.stockQuantity) return 'stock-limit';

            this.setQuantity(key, existingItem.quantity + quantity);
            return 'added';
        }

        if (product.stockQuantity < 1) return 'unavailable';

        const primaryImage = product.images.find((image) => image.isPrimary) ?? product.images[0];
        this.updateItems([
            ...this.cartItems(),
            {
                key,
                productId: product.id,
                slug: product.slug,
                name: product.name,
                imageUrl: primaryImage?.url ?? null,
                imageAlt: primaryImage?.altText || product.name,
                price: product.price,
                currency: product.currency,
                stockQuantity: product.stockQuantity,
                color,
                size,
                quantity: Math.min(Math.max(1, quantity), product.stockQuantity),
            },
        ]);
        return 'added';
    }

    setQuantity(key: string, quantity: number): void {
        const item = this.cartItems().find((candidate) => candidate.key === key);
        if (!item) return;

        if (quantity < 1) {
            this.remove(key);
            return;
        }

        this.updateItems(
            this.cartItems().map((candidate) =>
                candidate.key === key
                    ? { ...candidate, quantity: Math.min(quantity, candidate.stockQuantity) }
                    : candidate,
            ),
        );
    }

    remove(key: string): void {
        this.updateItems(this.cartItems().filter((item) => item.key !== key));
    }

    clear(): void {
        this.updateItems([]);
    }

    private createKey(productId: string, colorId: string, sizeId: string): string {
        return `${productId}:${colorId}:${sizeId}`;
    }

    private updateItems(items: CartItem[]): void {
        this.cartItems.set(items);
        if (!isPlatformBrowser(this.platformId)) return;

        try {
            localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
        } catch {
            // The in-memory cart remains usable when storage is unavailable.
        }
    }

    private readStoredCart(): CartItem[] {
        try {
            const value: unknown = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) ?? '[]');
            if (!Array.isArray(value)) return [];

            return value.filter((item): item is CartItem =>
                typeof item === 'object' &&
                item !== null &&
                typeof item.key === 'string' &&
                typeof item.productId === 'string' &&
                typeof item.quantity === 'number' &&
                item.quantity > 0,
            );
        } catch {
            return [];
        }
    }
}
