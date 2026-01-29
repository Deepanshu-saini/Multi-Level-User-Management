import { Component, OnInit } from '@angular/core';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  template: `
    <div class="app-container">
      <app-navigation *ngIf="authService.isAuthenticated$ | async"></app-navigation>
      <main class="main-content" [class.with-nav]="authService.isAuthenticated$ | async">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .app-container {
      height: 100vh;
      display: flex;
      flex-direction: column;
    }
    
    .main-content {
      flex: 1;
      overflow: auto;
    }
    
    .main-content.with-nav {
      margin-top: 64px; /* Height of toolbar */
    }
    
    @media (max-width: 768px) {
      .main-content.with-nav {
        margin-top: 56px; /* Smaller toolbar height on mobile */
      }
    }
  `]
})
export class AppComponent implements OnInit {
  title = 'Multi-Level User Management System';

  constructor(public authService: AuthService) {}

  ngOnInit() {
    // Check if user is already authenticated on app start
    this.authService.checkAuthStatus();
  }
}