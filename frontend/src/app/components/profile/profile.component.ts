import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';

import { User } from '../../models/user.model';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  profileForm: FormGroup;
  passwordForm: FormGroup;
  currentUser: User | null = null;
  isLoading = false;
  isPasswordLoading = false;
  hideCurrentPassword = true;
  hideNewPassword = true;
  hideConfirmPassword = true;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private userService: UserService,
    private snackBar: MatSnackBar
  ) {
    this.profileForm = this.fb.group({
      username: ['', [
        Validators.required, 
        Validators.minLength(3), 
        Validators.maxLength(30),
        Validators.pattern(/^[a-zA-Z0-9_]+$/)
      ]],
      email: ['', [Validators.required, Validators.email]]
    });

    this.passwordForm = this.fb.group({
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [
        Validators.required, 
        Validators.minLength(6),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      ]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user) {
        this.profileForm.patchValue({
          username: user.username,
          email: user.email
        });
      }
    });
  }

  passwordMatchValidator(form: FormGroup) {
    const newPassword = form.get('newPassword');
    const confirmPassword = form.get('confirmPassword');
    
    if (newPassword && confirmPassword && newPassword.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    
    return null;
  }

  onUpdateProfile() {
    if (this.profileForm.valid) {
      this.isLoading = true;
      const formData = this.profileForm.value;

      this.userService.updateCurrentUserProfile(formData).subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.success && response.data) {
            // Update the current user in auth service
            this.authService.verifyToken().subscribe();
            this.snackBar.open('Profile updated successfully', 'Close', { duration: 3000 });
          }
        },
        error: (error) => {
          this.isLoading = false;
          console.error('Error updating profile:', error);
          this.snackBar.open(
            error.error?.message || 'Failed to update profile', 
            'Close', 
            { duration: 3000 }
          );
        }
      });
    } else {
      this.markFormGroupTouched(this.profileForm);
    }
  }

  onChangePassword() {
    if (this.passwordForm.valid) {
      this.isPasswordLoading = true;
      const formData = this.passwordForm.value;

      this.authService.changePassword(formData).subscribe({
        next: (response) => {
          this.isPasswordLoading = false;
          if (response.success) {
            this.snackBar.open('Password changed successfully', 'Close', { duration: 3000 });
            this.passwordForm.reset();
          }
        },
        error: (error) => {
          this.isPasswordLoading = false;
          console.error('Error changing password:', error);
          this.snackBar.open(
            error.error?.message || 'Failed to change password', 
            'Close', 
            { duration: 3000 }
          );
        }
      });
    } else {
      this.markFormGroupTouched(this.passwordForm);
    }
  }

  getErrorMessage(form: FormGroup, fieldName: string): string {
    const field = form.get(fieldName);
    
    if (field?.hasError('required')) {
      return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;
    }
    if (field?.hasError('email')) {
      return 'Please enter a valid email address';
    }
    if (field?.hasError('minlength')) {
      return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} must be at least ${field.errors?.['minlength'].requiredLength} characters`;
    }
    if (field?.hasError('maxlength')) {
      return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} cannot exceed ${field.errors?.['maxlength'].requiredLength} characters`;
    }
    if (field?.hasError('pattern')) {
      if (fieldName === 'username') {
        return 'Username can only contain letters, numbers, and underscores';
      }
      if (fieldName === 'newPassword') {
        return 'Password must contain at least one lowercase letter, one uppercase letter, and one number';
      }
    }
    if (field?.hasError('passwordMismatch')) {
      return 'Passwords do not match';
    }
    
    return '';
  }

  getRoleDisplayName(role: string): string {
    const roleNames: { [key: string]: string } = {
      'super_admin': 'Super Admin',
      'admin': 'Admin',
      'moderator': 'Moderator',
      'user': 'User'
    };
    return roleNames[role] || role;
  }

  getRoleColor(role: string): string {
    const roleColors: { [key: string]: string } = {
      'super_admin': 'role-super-admin',
      'admin': 'role-admin',
      'moderator': 'role-moderator',
      'user': 'role-user'
    };
    return roleColors[role] || 'role-user';
  }

  private markFormGroupTouched(form: FormGroup) {
    Object.keys(form.controls).forEach(key => {
      const control = form.get(key);
      control?.markAsTouched();
    });
  }
}