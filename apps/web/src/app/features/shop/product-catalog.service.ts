import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@env/environment';
import { Observable } from 'rxjs';

export interface CatalogProductImage {
    id: string;
    url: string;
    contentType: string;
    altText: string | null;
    sortOrder: number;
    isPrimary: boolean;
}

export interface CatalogProduct {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    price: number;
    compareAtPrice: number | null;
    currency: string;
    stockQuantity: number;
    images: CatalogProductImage[];
    options: CatalogProductOption[];
}

export interface CatalogProductOptionValue {
    id: string;
    value: string;
    colorHex: string | null;
    sortOrder: number;
}

export interface CatalogProductOption {
    id: string;
    name: string;
    sortOrder: number;
    values: CatalogProductOptionValue[];
}

export interface CatalogResponse {
    page: number;
    pageSize: number;
    totalCount: number;
    items: CatalogProduct[];
}

export interface CatalogParams {
    search?: string;
    inStock?: boolean;
    minPrice?: number;
    maxPrice?: number;
    sort?: string;
    page: number;
    pageSize: number;
}

@Injectable({ providedIn: 'root' })
export class ProductCatalogService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = `${environment.apiBaseUrl}/api/products`;

    getProducts(params: CatalogParams): Observable<CatalogResponse> {
        let httpParams = new HttpParams()
            .set('page', params.page)
            .set('pageSize', params.pageSize);

        if (params.search) httpParams = httpParams.set('search', params.search);
        if (params.inStock !== undefined) httpParams = httpParams.set('inStock', params.inStock);
        if (params.minPrice !== undefined) httpParams = httpParams.set('minPrice', params.minPrice);
        if (params.maxPrice !== undefined) httpParams = httpParams.set('maxPrice', params.maxPrice);
        if (params.sort) httpParams = httpParams.set('sort', params.sort);

        return this.http.get<CatalogResponse>(this.apiUrl, { params: httpParams });
    }
}
