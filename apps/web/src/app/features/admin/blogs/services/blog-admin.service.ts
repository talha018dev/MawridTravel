import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@env/environment';
import { Observable } from 'rxjs';

export interface Blog {
    id: string;
    title: string;
    slug: string;
    excerpt: string | null;
    content: string;
    featuredImageUrl: string | null;
    isPublished: boolean;
    publishedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface BlogListResponse {
    page: number;
    pageSize: number;
    totalCount: number;
    items: Blog[];
}

export interface BlogListParams {
    search?: string;
    isPublished?: boolean;
    page: number;
    pageSize: number;
}

export interface BlogWriteRequest {
    title: string;
    slug: string | null;
    excerpt: string | null;
    content: string;
    isPublished: boolean;
}

@Injectable({ providedIn: 'root' })
export class BlogAdminService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = `${environment.apiBaseUrl}/api/admin/blogs`;

    getBlogs(params: BlogListParams): Observable<BlogListResponse> {
        let httpParams = new HttpParams()
            .set('page', params.page)
            .set('pageSize', params.pageSize);

        if (params.search) {
            httpParams = httpParams.set('search', params.search);
        }
        if (params.isPublished !== undefined) {
            httpParams = httpParams.set('isPublished', params.isPublished);
        }

        return this.http.get<BlogListResponse>(this.apiUrl, {
            params: httpParams,
            withCredentials: true,
        });
    }

    createBlog(request: BlogWriteRequest): Observable<Blog> {
        return this.http.post<Blog>(this.apiUrl, request, { withCredentials: true });
    }

    getBlog(blogId: string): Observable<Blog> {
        return this.http.get<Blog>(`${this.apiUrl}/${blogId}`, { withCredentials: true });
    }

    deleteBlog(blogId: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${blogId}`, { withCredentials: true });
    }

    uploadFeaturedImage(blogId: string, file: File): Observable<Blog> {
        return this.http.post<Blog>(`${this.apiUrl}/${blogId}/featured-image`, file, {
            headers: { 'Content-Type': file.type },
            withCredentials: true,
        });
    }
}
