import { Component } from '@angular/core';

@Component({
  selector: 'app-profile',
  template: `
    <div class="profile-container">
      <h1>Profile</h1>
      <mat-card>
        <mat-card-content>
          <p>Profile management functionality will be implemented here.</p>
          <p>This will include:</p>
          <ul>
            <li>Edit personal information</li>
            <li>Change password</li>
            <li>View account details</li>
          </ul>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .profile-container {
      padding: 24px;
      max-width: 800px;
      margin: 0 auto;
    }
  `]
})
export class ProfileComponent {}