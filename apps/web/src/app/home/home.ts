import { DatePipe, isPlatformBrowser } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { CartService } from '@app/features/cart/cart.service';
import { PublicBlog, BlogService } from '@app/features/blogs/blog.service';
import { CatalogProduct, CatalogProductOption, ProductCatalogService } from '@app/features/shop/product-catalog.service';
import { MessageService } from '@openng/optimus-ui/api';
import { Toast } from '@openng/optimus-ui/toast';
import { catchError, forkJoin, of } from 'rxjs';

const WHATSAPP_URL =
  'https://wa.me/8801805226848?text=' +
  encodeURIComponent('Hello Mawrid Travel, I would like help planning a flight and comparing prices.');

@Component({
  selector: 'app-home',
  imports: [DatePipe, RouterLink, Toast],
  providers: [MessageService],
  templateUrl: './home.html',
})
export class Home implements OnInit {
  private readonly blogService = inject(BlogService);
  private readonly cart = inject(CartService);
  private readonly catalogService = inject(ProductCatalogService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly messageService = inject(MessageService);
  private readonly platformId = inject(PLATFORM_ID);

  protected readonly whatsappUrl = WHATSAPP_URL;
  protected readonly products = signal<CatalogProduct[]>([]);
  protected readonly blogs = signal<PublicBlog[]>([]);
  protected readonly loading = signal(true);
  protected readonly activeImageIndexes = signal<Record<string, number>>({});
  private readonly imageRotationTimers = new Map<string, ReturnType<typeof setInterval>>();
  private readonly imageStartTimers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.imageRotationTimers.forEach((timer) => clearInterval(timer));
      this.imageStartTimers.forEach((timer) => clearTimeout(timer));
    });
  }

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    forkJoin({
      products: this.catalogService
        .getProducts({ inStock: true, sort: 'newest', page: 1, pageSize: 4 })
        .pipe(catchError(() => of({ page: 1, pageSize: 4, totalCount: 0, items: [] }))),
      blogs: this.blogService
        .getBlogs('', 1, 3)
        .pipe(catchError(() => of({ page: 1, pageSize: 3, totalCount: 0, items: [] }))),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ products, blogs }) => {
        this.products.set(products.items);
        this.blogs.set(blogs.items);
        this.loading.set(false);
      });
  }

  protected formatPrice(product: CatalogProduct): string {
    return `${product.currency} ${new Intl.NumberFormat('en-BD', { maximumFractionDigits: 2 }).format(product.price)}`;
  }

  protected activeImageIndex(productId: string): number {
    return this.activeImageIndexes()[productId] ?? 0;
  }

  protected startImageRotation(product: CatalogProduct): void {
    if (product.images.length < 2 || this.imageStartTimers.has(product.id)) return;

    const startTimer = setTimeout(() => {
      this.advanceImage(product);
      const rotationTimer = setInterval(() => this.advanceImage(product), 2000);
      this.imageRotationTimers.set(product.id, rotationTimer);
      this.imageStartTimers.delete(product.id);
    }, 500);
    this.imageStartTimers.set(product.id, startTimer);
  }

  protected stopImageRotation(productId: string): void {
    const startTimer = this.imageStartTimers.get(productId);
    if (startTimer) clearTimeout(startTimer);
    const rotationTimer = this.imageRotationTimers.get(productId);
    if (rotationTimer) clearInterval(rotationTimer);
    this.imageStartTimers.delete(productId);
    this.imageRotationTimers.delete(productId);
    this.activeImageIndexes.update((indexes) => ({ ...indexes, [productId]: 0 }));
  }

  protected blogSummary(blog: PublicBlog): string {
    const value = (blog.excerpt || blog.content)
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return value.length > 150 ? `${value.slice(0, 147).trimEnd()}...` : value;
  }

  protected addToCart(product: CatalogProduct): void {
    const color = this.productOption(product, 'Color')?.values[0];
    const size = this.productOption(product, 'Size')?.values[0];
    if (!color || !size) {
      this.messageService.add({
        severity: 'error',
        summary: 'Item not added',
        detail: 'This product does not have the required color and size options.',
      });
      return;
    }

    const result = this.cart.add(product, color, size);
    this.messageService.add(
      result === 'added'
        ? { severity: 'success', summary: 'Added to cart', detail: `${product.name} was added to your cart.` }
        : {
            severity: 'error',
            summary: 'Item not added',
            detail: result === 'stock-limit'
              ? 'There are no more of this item available in stock.'
              : 'This item is currently unavailable.',
          },
    );
  }

  private productOption(product: CatalogProduct, name: string): CatalogProductOption | undefined {
    return product.options.find((option) => option.name.toLowerCase() === name.toLowerCase());
  }

  private advanceImage(product: CatalogProduct): void {
    this.activeImageIndexes.update((indexes) => ({
      ...indexes,
      [product.id]: ((indexes[product.id] ?? 0) + 1) % product.images.length,
    }));
  }
}
