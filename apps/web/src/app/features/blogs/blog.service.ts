import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@env/environment';
import { Observable } from 'rxjs';

export interface PublicBlog {
    id: string;
    title: string;
    slug: string;
    excerpt: string | null;
    content: string;
    metaTitle: string | null;
    metaDescription: string | null;
    canonicalUrl: string | null;
    socialTitle: string | null;
    socialDescription: string | null;
    featuredImageUrl: string | null;
    publishedAt: string;
    updatedAt: string;
}

export interface PublicBlogListResponse {
    page: number;
    pageSize: number;
    totalCount: number;
    items: PublicBlog[];
}

@Injectable({ providedIn: 'root' })
export class BlogService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = `${environment.apiBaseUrl}/api/blogs`;

    getBlogs(search: string, page: number, pageSize: number): Observable<PublicBlogListResponse> {
        let params = new HttpParams().set('page', page).set('pageSize', pageSize);
        if (search) params = params.set('search', search);

        return this.http.get<PublicBlogListResponse>(this.apiUrl, { params });
    }

    getBlog(slug: string): Observable<PublicBlog> {
        return this.http.get<PublicBlog>(`${this.apiUrl}/${encodeURIComponent(slug)}`);
    }
}
