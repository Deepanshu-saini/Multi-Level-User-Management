import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(
    private snackBar: MatSnackBar,
    private authService: AuthService,
    private router: Router
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        let errorMessage = 'An error occurred';
        let showSnackBar = true;

        if (error.error instanceof ErrorEvent) {
          // Client-side error
          errorMessage = error.error.message;
        } else {
          // Server-side error
          if (error.status === 401) {
            // Only show session expired if user was previously authenticated
            if (this.authService.isAuthenticated && !req.url.includes('/auth/login') && !req.url.includes('/auth/register')) {
              errorMessage = 'Session expired. Please login again.';
              this.authService.logout().subscribe();
              this.router.navigate(['/login']);
            } else {
              // Don't show snackbar for login/register 401 errors
              showSnackBar = false;
            }
          } else if (error.status === 403) {
            // Forbidden
            errorMessage = 'You do not have permission to perform this action.';
          } else if (error.status === 404) {
            // Not found
            errorMessage = 'Resource not found.';
          } else if (error.status === 500) {
            // Internal server error
            errorMessage = 'Server error. Please try again later.';
          } else if (error.error && error.error.message) {
            // Custom error message from server
            errorMessage = error.error.message;
          }
        }

        // Show error message (except for login/register pages to avoid duplicate messages)
        if (showSnackBar && !req.url.includes('/auth/login') && !req.url.includes('/auth/register')) {
          this.snackBar.open(errorMessage, 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
        }

        return throwError(() => error);
      })
    );
  }
}