import { Component } from '@angular/core';

@Component({
  selector: 'app-register',
  template: `
    <div class="register-container">
      <mat-card class="register-card">
        <mat-card-header>
          <mat-card-title>Register</mat-card-title>
          <mat-card-subtitle>Create a new account</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <p>Registration functionality will be implemented here.</p>
          <p>For now, please contact an administrator to create your account.</p>
        </mat-card-content>
        <mat-card-actions>
          <p class="text-center">
            Already have an account? 
            <a routerLink="/login" class="login-link">Login here</a>
          </p>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .register-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
    }
    .register-card {
      width: 100%;
      max-width: 400px;
      padding: 20px;
    }
    .login-link {
      color: #3f51b5;
      text-decoration: none;
      font-weight: 500;
    }
  `]
})
export class RegisterComponent {}