import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Observable, combineLatest } from 'rxjs';
import { map, take, filter } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean> {
    // Wait for auth check to complete, then check authentication status
    return combineLatest([
      this.authService.authCheckComplete$,
      this.authService.isAuthenticated$
    ]).pipe(
      filter(([checkComplete]) => checkComplete), // Wait until check is complete
      take(1),
      map(([_, isAuthenticated]) => {
        if (isAuthenticated) {
          return true;
        } else {
          this.router.navigate(['/login']);
          return false;
        }
      })
    );
  }
}