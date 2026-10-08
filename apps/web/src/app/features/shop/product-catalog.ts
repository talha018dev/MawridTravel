import { DOCUMENT } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Params, Router, RouterLink } from '@angular/router';
import {
    CatalogProduct,
    CatalogProductImage,
    ProductCatalogService,
} from '@app/features/shop/product-catalog.service';
import { ButtonDirective } from '@openng/optimus-ui/button';
import { IconField } from '@openng/optimus-ui/iconfield';
import { InputIcon } from '@openng/optimus-ui/inputicon';
import { InputNumber } from '@openng/optimus-ui/inputnumber';
import { InputText } from '@openng/optimus-ui/inputtext';
import { Select } from '@openng/optimus-ui/select';
import { Meta, Title } from '@angular/platform-browser';
import { debounceTime, distinctUntilChanged, finalize, map } from 'rxjs';

type StockFilter = 'all' | 'in-stock' | 'out-of-stock';
type CatalogSort = 'newest' | 'price-asc' | 'price-desc' | 'name';

@Component({
    selector: 'app-product-catalog',
    imports: [
        ButtonDirective,
        IconField,
        InputIcon,
        InputNumber,
        InputText,
        ReactiveFormsModule,
        RouterLink,
        Select,
    ],
    templateUrl: './product-catalog.html',
})
export class ProductCatalog implements OnInit {
    private readonly catalogService = inject(ProductCatalogService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly document = inject(DOCUMENT);
    private readonly meta = inject(Meta);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly title = inject(Title);
    private readonly pageSize = 20;
    private readonly imageRotationTimers = new Map<string, ReturnType<typeof setInterval>>();

    protected readonly searchControl = new FormControl('', { nonNullable: true });
    protected readonly stockControl = new FormControl<StockFilter>('all', { nonNullable: true });
    protected readonly sortControl = new FormControl<CatalogSort>('newest', { nonNullable: true });
    protected readonly minPriceControl = new FormControl<number | null>(null);
    protected readonly maxPriceControl = new FormControl<number | null>(null);
    protected readonly stockOptions = [
        { label: 'All availability', value: 'all' as const },
        { label: 'In stock', value: 'in-stock' as const },
        { label: 'Out of stock', value: 'out-of-stock' as const },
    ];
    protected readonly sortOptions = [
        { label: 'Newest', value: 'newest' as const },
        { label: 'Price: low to high', value: 'price-asc' as const },
        { label: 'Price: high to low', value: 'price-desc' as const },
        { label: 'Name', value: 'name' as const },
    ];
    protected readonly products = signal<CatalogProduct[]>([]);
    protected readonly page = signal(1);
    protected readonly totalCount = signal(0);
    protected readonly loading = signal(true);
    protected readonly errorMessage = signal<string | null>(null);
    protected readonly activeImageIndexes = signal<Record<string, number>>({});

    constructor() {
        this.destroyRef.onDestroy(() => {
            this.imageRotationTimers.forEach((timer) => clearInterval(timer));
        });
    }

    ngOnInit(): void {
        this.configureSeo();
        this.searchControl.valueChanges
            .pipe(map((value) => value.trim()), debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
            .subscribe(() => void this.updateUrl());
        this.minPriceControl.valueChanges
            .pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
            .subscribe(() => void this.updateUrl());
        this.maxPriceControl.valueChanges
            .pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
            .subscribe(() => void this.updateUrl());
        this.stockControl.valueChanges
            .pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
            .subscribe(() => void this.updateUrl());
        this.sortControl.valueChanges
            .pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
            .subscribe(() => void this.updateUrl());

        this.route.queryParamMap
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((params) => {
                this.searchControl.setValue(params.get('search')?.trim() ?? '', { emitEvent: false });
                this.stockControl.setValue(this.parseStock(params.get('stock')), { emitEvent: false });
                this.sortControl.setValue(this.parseSort(params.get('sort')), { emitEvent: false });
                this.minPriceControl.setValue(this.parsePrice(params.get('minPrice')), { emitEvent: false });
                this.maxPriceControl.setValue(this.parsePrice(params.get('maxPrice')), { emitEvent: false });
                this.page.set(this.parsePage(params.get('page')));
                this.loadProducts();
            });
    }

    protected totalPages(): number {
        return Math.max(1, Math.ceil(this.totalCount() / this.pageSize));
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

    protected activeImage(product: CatalogProduct): CatalogProductImage | undefined {
        return product.images[this.activeImageIndex(product.id)] ?? product.images[0];
    }

    protected activeImageIndex(productId: string): number {
        return this.activeImageIndexes()[productId] ?? 0;
    }

    protected startImageRotation(product: CatalogProduct): void {
        if (product.images.length < 2 || this.imageRotationTimers.has(product.id)) return;

        const timer = setInterval(() => {
            this.activeImageIndexes.update((indexes) => ({
                ...indexes,
                [product.id]: ((indexes[product.id] ?? 0) + 1) % product.images.length,
            }));
        }, 2000);

        this.imageRotationTimers.set(product.id, timer);
    }

    protected stopImageRotation(productId: string): void {
        const timer = this.imageRotationTimers.get(productId);

        if (timer) clearInterval(timer);

        this.imageRotationTimers.delete(productId);
        this.activeImageIndexes.update((indexes) => ({ ...indexes, [productId]: 0 }));
    }

    protected pageQuery(page: number): Params {
        return { ...this.currentQuery(), page: page > 1 ? page : null };
    }

    protected clearFilters(): void {
        void this.router.navigate(['/shop']);
    }

    protected retry(): void {
        this.loadProducts();
    }

    private updateUrl(): Promise<boolean> {
        return this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { ...this.currentQuery(), page: null },
        });
    }

    private currentQuery(): Params {
        const stock = this.stockControl.value;
        const sort = this.sortControl.value;
        return {
            search: this.searchControl.value.trim() || null,
            stock: stock === 'all' ? null : stock,
            minPrice: this.minPriceControl.value,
            maxPrice: this.maxPriceControl.value,
            sort: sort === 'newest' ? null : sort,
        };
    }

    private loadProducts(): void {
        this.loading.set(true);
        this.errorMessage.set(null);
        const stock = this.stockControl.value;
        this.catalogService
            .getProducts({
                search: this.searchControl.value.trim() || undefined,
                inStock: stock === 'all' ? undefined : stock === 'in-stock',
                minPrice: this.minPriceControl.value ?? undefined,
                maxPrice: this.maxPriceControl.value ?? undefined,
                sort: this.sortControl.value === 'newest' ? undefined : this.sortControl.value,
                page: this.page(),
                pageSize: this.pageSize,
            })
            .pipe(finalize(() => this.loading.set(false)), takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (response) => {
                    this.products.set(response.items);
                    this.totalCount.set(response.totalCount);
                    this.updateStructuredData(response.items);
                },
                error: (error: HttpErrorResponse) =>
                    this.errorMessage.set(
                        error.status === 0
                            ? 'The shop is temporarily unavailable. Please try again.'
                            : 'Unable to load products. Please try again.',
                    ),
            });
    }

    private configureSeo(): void {
        const title = 'Travel essentials shop | Mawrid Travel';
        const description = 'Shop curated travel essentials from Mawrid Travel. Browse current prices, availability and product information.';
        this.title.setTitle(title);
        this.meta.updateTag({ name: 'description', content: description });
        this.meta.updateTag({ name: 'robots', content: 'index, follow' });
        this.meta.updateTag({ property: 'og:title', content: title });
        this.meta.updateTag({ property: 'og:description', content: description });
        this.meta.updateTag({ property: 'og:type', content: 'website' });
        this.meta.updateTag({ property: 'og:url', content: 'https://mawridtravel.com/shop' });

        let canonical = this.document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
        if (!canonical) {
            canonical = this.document.createElement('link');
            canonical.rel = 'canonical';
            this.document.head.appendChild(canonical);
        }
        canonical.href = 'https://mawridtravel.com/shop';
    }

    private updateStructuredData(products: CatalogProduct[]): void {
        this.document.getElementById('shop-structured-data')?.remove();
        const script = this.document.createElement('script');
        script.id = 'shop-structured-data';
        script.type = 'application/ld+json';
        script.textContent = JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            numberOfItems: this.totalCount(),
            itemListElement: products.map((product, index) => ({
                '@type': 'ListItem',
                position: (this.page() - 1) * this.pageSize + index + 1,
                item: {
                    '@type': 'Product',
                    name: product.name,
                    description: product.description ?? undefined,
                    image: product.images[0]?.url,
                    offers: {
                        '@type': 'Offer',
                        price: product.price,
                        priceCurrency: product.currency,
                        availability: product.stockQuantity > 0
                            ? 'https://schema.org/InStock'
                            : 'https://schema.org/OutOfStock',
                    },
                },
            })),
        });
        this.document.head.appendChild(script);
    }

    private parseStock(value: string | null): StockFilter {
        return value === 'in-stock' || value === 'out-of-stock' ? value : 'all';
    }

    private parseSort(value: string | null): CatalogSort {
        return value === 'price-asc' || value === 'price-desc' || value === 'name' ? value : 'newest';
    }

    private parsePrice(value: string | null): number | null {
        const price = value === null ? Number.NaN : Number(value);
        return Number.isFinite(price) && price >= 0 ? price : null;
    }

    private parsePage(value: string | null): number {
        const page = Number(value);
        return Number.isInteger(page) && page > 0 ? page : 1;
    }
}
