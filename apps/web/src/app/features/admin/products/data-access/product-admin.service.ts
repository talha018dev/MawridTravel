import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@env/environment';
import { Observable } from 'rxjs';

export interface CreateProductRequest {
  name: string;
  slug: string | null;
  description: string | null;
  sku: string | null;
  price: number;
  compareAtPrice: number | null;
  currency: string;
  stockQuantity: number;
  isActive: boolean;
}

export interface ProductImage {
  id: string;
  url: string;
  contentType: string;
  altText: string | null;
  sortOrder: number;
  isPrimary: boolean;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sku: string | null;
  price: number;
  compareAtPrice: number | null;
  currency: string;
  stockQuantity: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  images: ProductImage[];
}

@Injectable({ providedIn: 'root' })
export class ProductAdminService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/api/admin/products`;

  createProduct(request: CreateProductRequest): Observable<Product> {
    return this.http.post<Product>(this.apiUrl, request, { withCredentials: true });
  }

  uploadImage(
    productId: string,
    file: File,
    altText: string,
    isPrimary: boolean,
  ): Observable<ProductImage> {
    let params = new HttpParams().set('isPrimary', isPrimary);
    const normalizedAltText = altText.trim();
    if (normalizedAltText) {
      params = params.set('altText', normalizedAltText);
    }

    return this.http.post<ProductImage>(`${this.apiUrl}/${productId}/images`, file, {
      headers: { 'Content-Type': file.type },
      params,
      withCredentials: true,
    });
  }
}
