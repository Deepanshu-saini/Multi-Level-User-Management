import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { User } from '../../../models/user.model';
import { BalanceService } from '../../../services/balance.service';

export interface BalanceDialogData {
  user: User;
  operation: 'add' | 'deduct';
}

@Component({
  selector: 'app-balance-dialog',
  templateUrl: './balance-dialog.component.html',
  styleUrls: ['./balance-dialog.component.scss']
})
export class BalanceDialogComponent implements OnInit {
  balanceForm: FormGroup;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private balanceService: BalanceService,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<BalanceDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: BalanceDialogData
  ) {
    this.balanceForm = this.fb.group({
      amount: ['', [
        Validators.required,
        Validators.min(0.01),
        Validators.max(10000)
      ]],
      description: ['', [
        Validators.required,
        Validators.minLength(1),
        Validators.maxLength(500)
      ]]
    });
  }

  ngOnInit() {
    // Set default description based on operation
    const defaultDescription = this.data.operation === 'add' 
      ? `Balance credit for ${this.data.user.username}`
      : `Balance debit for ${this.data.user.username}`;
    
    this.balanceForm.patchValue({
      description: defaultDescription
    });

    // Add additional validation for deduct operation
    if (this.data.operation === 'deduct') {
      const amountControl = this.balanceForm.get('amount');
      amountControl?.setValidators([
        Validators.required,
        Validators.min(0.01),
        Validators.max(this.data.user.balance)
      ]);
      amountControl?.updateValueAndValidity();
    }
  }

  onSubmit() {
    if (!this.balanceForm.valid) {
      this.markFormGroupTouched();
      return;
    }
    
    // Handle both id and _id properties (MongoDB uses _id, but frontend may use id)
    const userId = this.data.user?.id || (this.data.user as any)?._id || (this.data.user as any)?.userId;
    
    if (!userId) {
      console.error('User ID is missing from user object:', this.data.user);
      console.error('Available user properties:', Object.keys(this.data.user || {}));
      this.snackBar.open('User ID is missing. Please refresh and try again.', 'Close', { duration: 3000 });
      return;
    }
    
    const amount = parseFloat(this.balanceForm.value.amount);
    const description = this.balanceForm.value.description?.trim() || '';
    
    if (!description) {
      this.snackBar.open('Description is required.', 'Close', { duration: 3000 });
      return;
    }
    
    if (isNaN(amount) || amount <= 0) {
      this.snackBar.open('Amount must be a positive number.', 'Close', { duration: 3000 });
      return;
    }
    
    this.isLoading = true;
    
    const formData = {
      userId: String(userId), // Ensure it's a string
      amount: Number(amount), // Ensure it's a number, not string
      description: String(description).trim() // Ensure it's a string and trimmed
    };
    
    console.log('Submitting balance operation:', formData);
    console.log('User object:', this.data.user);

    const operation = this.data.operation === 'add' 
      ? this.balanceService.addBalance(formData)
      : this.balanceService.deductBalance(formData);

    operation.subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success) {
          const action = this.data.operation === 'add' ? 'added to' : 'deducted from';
          this.snackBar.open(
            `$${formData.amount.toFixed(2)} ${action} ${this.data.user.username}'s account`, 
            'Close', 
            { duration: 3000 }
          );
          this.dialogRef.close(true);
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Balance operation error:', error);
        this.snackBar.open(
          error.error?.message || 'Balance operation failed', 
          'Close', 
          { duration: 3000 }
        );
      }
    });
  }

  onCancel() {
    this.dialogRef.close(false);
  }

  getTitle(): string {
    return this.data.operation === 'add' ? 'Add Balance' : 'Deduct Balance';
  }

  getButtonText(): string {
    return this.data.operation === 'add' ? 'Add Balance' : 'Deduct Balance';
  }

  getButtonColor(): string {
    return this.data.operation === 'add' ? 'primary' : 'accent';
  }

  getMaxAmount(): number {
    return this.data.operation === 'add' ? 10000 : this.data.user.balance;
  }

  getNewBalance(): number {
    const amount = parseFloat(this.balanceForm.get('amount')?.value || '0');
    return this.data.operation === 'add' 
      ? this.data.user.balance + amount
      : this.data.user.balance - amount;
  }

  getErrorMessage(fieldName: string): string {
    const field = this.balanceForm.get(fieldName);
    
    if (field?.hasError('required')) {
      return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;
    }
    if (field?.hasError('min')) {
      return `Amount must be greater than $0.00`;
    }
    if (field?.hasError('max')) {
      const maxAmount = this.getMaxAmount();
      return `Amount cannot exceed $${maxAmount.toFixed(2)}`;
    }
    if (field?.hasError('minlength')) {
      return `Description must be at least ${field.errors?.['minlength'].requiredLength} characters`;
    }
    if (field?.hasError('maxlength')) {
      return `Description cannot exceed ${field.errors?.['maxlength'].requiredLength} characters`;
    }
    
    return '';
  }

  private markFormGroupTouched() {
    Object.keys(this.balanceForm.controls).forEach(key => {
      const control = this.balanceForm.get(key);
      control?.markAsTouched();
    });
  }
}