import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-navigation',
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.scss']
})
export class NavigationComponent {
  constructor(
    public authService: AuthService,
    private router: Router
  ) {}

  logout() {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
      error: (error) => {
        console.error('Logout error:', error);
        // Force logout even if server request fails
        this.router.navigate(['/login']);
      }
    });
  }

  canAccessUsers(): boolean {
    return this.authService.hasRole(['admin', 'super_admin']);
  }

  canAccessBalance(): boolean {
    return this.authService.hasRole(['admin', 'super_admin']);
  }
}