import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { Router } from '@angular/router';

import { User } from '../models/user.model';
import { ApiResponse } from '../models/api-response.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = environment.apiUrl;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);

  public currentUser$ = this.currentUserSubject.asObservable();
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  get isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  getCaptcha(): Observable<string> {
    return this.http.get(`${this.API_URL}/auth/captcha`, { 
      responseType: 'text' 
    });
  }

  register(userData: {
    username: string;
    email: string;
    password: string;
    role?: string;
  }): Observable<ApiResponse<{ user: User; token: string }>> {
    return this.http.post<ApiResponse<{ user: User; token: string }>>(
      `${this.API_URL}/auth/register`,
      userData
    ).pipe(
      tap(response => {
        if (response.success && response.data) {
          this.setCurrentUser(response.data.user);
        }
      }),
      catchError(this.handleError)
    );
  }

  login(credentials: {
    email: string;
    password: string;
    captcha: string;
  }): Observable<ApiResponse<{ user: User; token: string }>> {
    return this.http.post<ApiResponse<{ user: User; token: string }>>(
      `${this.API_URL}/auth/login`,
      credentials
    ).pipe(
      tap(response => {
        if (response.success && response.data) {
          this.setCurrentUser(response.data.user);
        }
      }),
      catchError(this.handleError)
    );
  }

  logout(): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.API_URL}/auth/logout`, {}).pipe(
      tap(() => {
        this.clearCurrentUser();
        this.router.navigate(['/login']);
      }),
      catchError(this.handleError)
    );
  }

  verifyToken(): Observable<ApiResponse<{ user: User }>> {
    return this.http.get<ApiResponse<{ user: User }>>(`${this.API_URL}/auth/verify`).pipe(
      tap(response => {
        if (response.success && response.data) {
          this.setCurrentUser(response.data.user);
        }
      }),
      catchError(this.handleError)
    );
  }

  changePassword(passwordData: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(
      `${this.API_URL}/auth/change-password`,
      passwordData
    ).pipe(
      catchError(this.handleError)
    );
  }

  refreshToken(): Observable<ApiResponse<{ token: string }>> {
    return this.http.post<ApiResponse<{ token: string }>>(
      `${this.API_URL}/auth/refresh`,
      {}
    ).pipe(
      catchError(this.handleError)
    );
  }

  checkAuthStatus(): void {
    this.verifyToken().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.setCurrentUser(response.data.user);
        }
      },
      error: () => {
        this.clearCurrentUser();
      }
    });
  }

  hasRole(roles: string | string[]): boolean {
    const user = this.currentUser;
    if (!user) return false;

    const requiredRoles = Array.isArray(roles) ? roles : [roles];
    return requiredRoles.includes(user.role);
  }

  canManageUser(targetUser: User): boolean {
    const currentUser = this.currentUser;
    if (!currentUser) return false;

    const roleHierarchy: { [key: string]: number } = {
      'super_admin': 4,
      'admin': 3,
      'moderator': 2,
      'user': 1
    };

    const currentUserLevel = roleHierarchy[currentUser.role] || 0;
    const targetUserLevel = roleHierarchy[targetUser.role] || 0;

    return currentUserLevel > targetUserLevel;
  }

  private setCurrentUser(user: User): void {
    this.currentUserSubject.next(user);
    this.isAuthenticatedSubject.next(true);
  }

  private clearCurrentUser(): void {
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
  }

  private handleError(error: any): Observable<never> {
    console.error('Auth service error:', error);
    return throwError(() => error);
  }
}