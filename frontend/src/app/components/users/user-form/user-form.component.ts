import { Component } from '@angular/core';

@Component({
  selector: 'app-user-form',
  template: `
    <div class="user-form-container">
      <h1>User Form</h1>
      <mat-card>
        <mat-card-content>
          <p>This component is used internally by the User Dialog.</p>
          <p>All user creation and editing is handled through the User Management page.</p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .user-form-container {
      padding: 24px;
      max-width: 600px;
      margin: 0 auto;
    }
  `]
})
export class UserFormComponent {}