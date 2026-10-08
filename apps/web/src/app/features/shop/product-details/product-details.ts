import { DOCUMENT } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CartService } from '@app/features/cart/cart.service';
import {
    CatalogProduct,
    CatalogProductOption,
    ProductCatalogService,
} from '@app/features/shop/product-catalog.service';
import { ButtonDirective } from '@openng/optimus-ui/button';
import { Meta, Title } from '@angular/platform-browser';
import { finalize } from 'rxjs';

@Component({
    selector: 'app-shop-product-details',
    imports: [ButtonDirective, RouterLink],
    templateUrl: './product-details.html',
})
export class ProductDetails implements OnInit {
    private readonly catalogService = inject(ProductCatalogService);
    private readonly cart = inject(CartService);
    private readonly document = inject(DOCUMENT);
    private readonly meta = inject(Meta);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly title = inject(Title);

    protected readonly product = signal<CatalogProduct | null>(null);
    protected readonly loading = signal(true);
    protected readonly errorMessage = signal<string | null>(null);
    protected readonly activeImageIndex = signal(0);
    protected readonly selectedColorId = signal<string | null>(null);
    protected readonly selectedSizeId = signal<string | null>(null);
    protected readonly detailsExpanded = signal(false);
    protected readonly cartMessage = signal<string | null>(null);
    protected readonly descriptionIsLong = computed(
        () => (this.product()?.description?.trim().length ?? 0) > 320,
    );

    ngOnInit(): void {
        const slug = this.route.snapshot.paramMap.get('slug');
        if (!slug) {
            this.loading.set(false);
            this.errorMessage.set('This product could not be found.');
            return;
        }

        this.catalogService
            .getProduct(slug)
            .pipe(finalize(() => this.loading.set(false)))
            .subscribe({
                next: (product) => {
                    this.product.set(product);
                    this.detailsExpanded.set(false);
                    this.selectedColorId.set(this.option(product, 'Color')?.values[0]?.id ?? null);
                    this.selectedSizeId.set(this.option(product, 'Size')?.values[0]?.id ?? null);
                    this.configureSeo(product);
                },
                error: (error: HttpErrorResponse) => {
                    this.errorMessage.set(
                        error.status === 404
                            ? 'This product is no longer available.'
                            : 'Unable to load this product. Please try again.',
                    );
                },
            });
    }

    protected option(product: CatalogProduct, name: string): CatalogProductOption | undefined {
        return product.options?.find(
            (option) => option.name.toLowerCase() === name.toLowerCase(),
        );
    }

    protected selectImage(index: number): void {
        this.activeImageIndex.set(index);
    }

    protected previousImage(imageCount: number): void {
        this.activeImageIndex.update((index) => (index - 1 + imageCount) % imageCount);
    }

    protected nextImage(imageCount: number): void {
        this.activeImageIndex.update((index) => (index + 1) % imageCount);
    }

    protected galleryTransform(): string {
        return `translateX(-${this.activeImageIndex() * 100}%)`;
    }

    protected toggleDetails(): void {
        this.detailsExpanded.update((expanded) => !expanded);
    }

    protected addToCart(product: CatalogProduct, buyNow = false): void {
        const color = this.option(product, 'Color')?.values.find(
            (value) => value.id === this.selectedColorId(),
        );
        const size = this.option(product, 'Size')?.values.find(
            (value) => value.id === this.selectedSizeId(),
        );
        if (!color || !size || product.stockQuantity < 1) return;

        this.cart.add(product, color, size);
        if (buyNow) {
            void this.router.navigateByUrl('/cart');
            return;
        }

        this.cartMessage.set('Added to your cart.');
        setTimeout(() => this.cartMessage.set(null), 2500);
    }

    protected formatPrice(product: CatalogProduct, value = product.price): string {
        if (product.currency.toUpperCase() === 'BDT') {
            const amount = new Intl.NumberFormat('en-BD', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
            }).format(value);
            return `৳ ${amount}`;
        }

        try {
            return new Intl.NumberFormat('en-BD', {
                style: 'currency',
                currency: product.currency,
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
            }).format(value);
        } catch {
            return `${product.currency} ${value.toFixed(2)}`;
        }
    }

    protected discountPercentage(product: CatalogProduct): number | null {
        if (product.compareAtPrice === null || product.compareAtPrice <= product.price) return null;
        return Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100);
    }

    private configureSeo(product: CatalogProduct): void {
        const title = `${product.name} | Mawrid Travel`;
        const description = product.description?.trim() ||
            `Shop ${product.name} from Mawrid Travel.`;
        const url = `https://mawridtravel.com/shop/${product.slug}`;
        const image = product.images[0]?.url;

        this.title.setTitle(title);
        this.meta.updateTag({ name: 'description', content: description.slice(0, 160) });
        this.meta.updateTag({ name: 'robots', content: 'index, follow' });
        this.meta.updateTag({ property: 'og:title', content: title });
        this.meta.updateTag({ property: 'og:description', content: description.slice(0, 160) });
        this.meta.updateTag({ property: 'og:type', content: 'product' });
        this.meta.updateTag({ property: 'og:url', content: url });
        if (image) this.meta.updateTag({ property: 'og:image', content: image });

        let canonical = this.document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
        if (!canonical) {
            canonical = this.document.createElement('link');
            canonical.rel = 'canonical';
            this.document.head.appendChild(canonical);
        }
        canonical.href = url;

        this.document.getElementById('product-structured-data')?.remove();
        const script = this.document.createElement('script');
        script.id = 'product-structured-data';
        script.type = 'application/ld+json';
        script.textContent = JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: product.name,
            description: product.description ?? undefined,
            image: product.images.map((item) => item.url),
            sku: undefined,
            offers: {
                '@type': 'Offer',
                url,
                price: product.price,
                priceCurrency: product.currency,
                availability: product.stockQuantity > 0
                    ? 'https://schema.org/InStock'
                    : 'https://schema.org/OutOfStock',
            },
        });
        this.document.head.appendChild(script);
    }
}
