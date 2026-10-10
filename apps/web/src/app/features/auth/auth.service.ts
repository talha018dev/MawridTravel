import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { catchError, finalize, Observable, of, shareReplay, tap, throwError } from 'rxjs';
import { environment } from '@env/environment';

export interface LoginRequest {
    email: string;
    password: string;
    rememberMe: boolean;
}

export interface LoginResponse {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber?: string | null;
    address?: string | null;
    roles: string[];
}

export interface UpdateProfileRequest {
    firstName: string;
    lastName: string;
    phoneNumber: string | null;
    address: string | null;
}

export type AuthUser = LoginResponse;

export interface RegisterRequest {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
}

export interface RegisterResponse {
    email: string;
    requiresOtp: boolean;
}

export interface VerifyOtpRequest {
    email: string;
    otp: string;
}

export interface VerifyOtpResponse {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    roles: string[];
}

export interface ResendOtpResponse {
    message: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
    private readonly http = inject(HttpClient);
    private readonly platformId = inject(PLATFORM_ID);
    private readonly apiUrl = `${environment.apiBaseUrl}/api/auth`;
    private readonly currentUser = signal<AuthUser | null>(null);

    private sessionLoaded = false;
    private sessionRequest: Observable<AuthUser | null> | null = null;

    readonly user = this.currentUser.asReadonly();
    readonly authenticated = computed(() => this.currentUser() !== null);

    ensureSession(): Observable<AuthUser | null> {
        if (!isPlatformBrowser(this.platformId)) return of(null);
        if (this.sessionLoaded) return of(this.currentUser());
        if (this.sessionRequest) return this.sessionRequest;

        this.sessionRequest = this.http
            .get<AuthUser>(`${this.apiUrl}/me`, { withCredentials: true })
            .pipe(
                tap((user) => this.currentUser.set(user)),
                catchError(() => {
                    this.currentUser.set(null);
                    return of(null);
                }),
                finalize(() => {
                    this.sessionLoaded = true;
                    this.sessionRequest = null;
                }),
                shareReplay({ bufferSize: 1, refCount: false }),
            );

        return this.sessionRequest;
    }

    login(request: LoginRequest): Observable<LoginResponse> {
        return this.http
            .post<LoginResponse>(`${this.apiUrl}/login`, request, { withCredentials: true })
            .pipe(tap((user) => this.setAuthenticatedUser(user)));
    }

    register(request: RegisterRequest): Observable<RegisterResponse> {
        return this.http.post<RegisterResponse>(`${this.apiUrl}/register`, request, {
            withCredentials: true,
        });
    }

    verifyOtp(request: VerifyOtpRequest): Observable<VerifyOtpResponse> {
        return this.http
            .post<VerifyOtpResponse>(`${this.apiUrl}/verify-otp`, request, { withCredentials: true })
            .pipe(tap((user) => this.setAuthenticatedUser(user)));
    }

    resendOtp(email: string): Observable<ResendOtpResponse> {
        return this.http.post<ResendOtpResponse>(
            `${this.apiUrl}/resend-otp`,
            { email },
            { withCredentials: true },
        );
    }

    logout(): Observable<void> {
        this.currentUser.set(null);
        this.sessionLoaded = true;

        return this.http.post<void>(`${this.apiUrl}/logout`, null, { withCredentials: true }).pipe(
            catchError((error: unknown) => {
                if (error instanceof Object && 'status' in error && error.status === 401) {
                    return of(undefined);
                }
                return throwError(() => error);
            }),
        );
    }

    updateProfile(request: UpdateProfileRequest): Observable<AuthUser> {
        return this.http
            .put<AuthUser>(`${this.apiUrl}/profile`, request, { withCredentials: true })
            .pipe(tap((user) => this.setAuthenticatedUser(user)));
    }

    private setAuthenticatedUser(user: AuthUser): void {
        this.currentUser.set(user);
        this.sessionLoaded = true;
    }
}
