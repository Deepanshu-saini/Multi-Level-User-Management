import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { User } from '../../../models/user.model';
import { UserService } from '../../../services/user.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-user-dialog',
  templateUrl: './user-dialog.component.html',
  styleUrls: ['./user-dialog.component.scss']
})
export class UserDialogComponent implements OnInit {
  userForm: FormGroup;
  isLoading = false;
  isEditMode = false;
  hidePassword = true;

  roles = [
    { value: 'user', label: 'User' },
    { value: 'moderator', label: 'Moderator' },
    { value: 'admin', label: 'Admin' },
    { value: 'super_admin', label: 'Super Admin' }
  ];

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<UserDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: User | null
  ) {
    this.isEditMode = !!data;
    
    this.userForm = this.fb.group({
      username: ['', [
        Validators.required, 
        Validators.minLength(3), 
        Validators.maxLength(30),
        Validators.pattern(/^[a-zA-Z0-9_]+$/)
      ]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', this.isEditMode ? [] : [
        Validators.required, 
        Validators.minLength(6),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      ]],
      role: ['user', [Validators.required]],
      isActive: [true]
    });
  }

  ngOnInit() {
    // Filter roles based on current user permissions
    this.filterAvailableRoles();
    
    if (this.isEditMode && this.data) {
      this.userForm.patchValue({
        username: this.data.username,
        email: this.data.email,
        role: this.data.role,
        isActive: this.data.isActive
      });
      
      // Remove password requirement for edit mode
      this.userForm.get('password')?.clearValidators();
      this.userForm.get('password')?.updateValueAndValidity();
    }
  }

  filterAvailableRoles() {
    const currentUser = this.authService.currentUser;
    if (!currentUser) return;

    if (currentUser.role === 'admin') {
      // Admin can only assign user, moderator, and admin roles
      this.roles = this.roles.filter(role => 
        ['user', 'moderator', 'admin'].includes(role.value)
      );
    } else if (currentUser.role !== 'super_admin') {
      // Non-admin users can't assign roles
      this.roles = [{ value: 'user', label: 'User' }];
    }
  }

  onSubmit() {
    if (this.userForm.valid) {
      this.isLoading = true;
      const formData: any = { ...this.userForm.value };
      
      // Remove password if empty in edit mode
      if (this.isEditMode && !formData.password) {
        delete formData.password;
      }
      
      // Ensure isActive is a boolean (not string)
      if (formData.isActive !== undefined) {
        formData.isActive = Boolean(formData.isActive);
      }
      
      // Ensure role is a string if provided
      if (formData.role && typeof formData.role !== 'string') {
        formData.role = String(formData.role);
      }

      const operation = this.isEditMode 
        ? this.userService.updateUser(this.data!.id, formData)
        : this.userService.createUser(formData);

      operation.subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.success) {
            const action = this.isEditMode ? 'updated' : 'created';
            this.snackBar.open(`User ${action} successfully`, 'Close', { duration: 3000 });
            this.dialogRef.close(true);
          }
        },
        error: (error) => {
          this.isLoading = false;
          console.error('Error saving user:', error);
          this.snackBar.open(
            error.error?.message || 'Failed to save user', 
            'Close', 
            { duration: 3000 }
          );
        }
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  onCancel() {
    this.dialogRef.close(false);
  }

  getErrorMessage(fieldName: string): string {
    const field = this.userForm.get(fieldName);
    
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
      if (fieldName === 'password') {
        return 'Password must contain at least one lowercase letter, one uppercase letter, and one number';
      }
    }
    
    return '';
  }

  private markFormGroupTouched() {
    Object.keys(this.userForm.controls).forEach(key => {
      const control = this.userForm.get(key);
      control?.markAsTouched();
    });
  }
}