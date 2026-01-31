import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormControl } from '@angular/forms';

import { User } from '../../../models/user.model';
import { UserService } from '../../../services/user.service';
import { BalanceService } from '../../../services/balance.service';
import { AuthService } from '../../../services/auth.service';
import { BalanceDialogComponent } from '../balance-dialog/balance-dialog.component';

@Component({
  selector: 'app-balance-management',
  templateUrl: './balance-management.component.html',
  styleUrls: ['./balance-management.component.scss']
})
export class BalanceManagementComponent implements OnInit {
  users: User[] = [];
  filteredUsers: User[] = [];
  isLoading = false;
  searchControl = new FormControl('');

  constructor(
    private userService: UserService,
    private balanceService: BalanceService,
    public authService: AuthService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.loadUsers();
    this.setupSearch();
  }

  setupSearch() {
    this.searchControl.valueChanges.subscribe(searchTerm => {
      this.filterUsers(searchTerm || '');
    });
  }

  loadUsers() {
    this.isLoading = true;
    
    this.userService.getUsers({ limit: 100 }).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success && response.data) {
          // Transform users to ensure they have 'id' property (MongoDB returns _id)
          this.users = response.data.users.map((user: any) => ({
            ...user,
            id: user.id || user._id || user.userId
          }));
          this.filteredUsers = [...this.users];
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error loading users:', error);
        this.snackBar.open('Failed to load users', 'Close', { duration: 3000 });
      }
    });
  }

  filterUsers(searchTerm: string) {
    if (!searchTerm.trim()) {
      this.filteredUsers = [...this.users];
      return;
    }

    const term = searchTerm.toLowerCase();
    this.filteredUsers = this.users.filter(user =>
      user.username.toLowerCase().includes(term) ||
      user.email.toLowerCase().includes(term)
    );
  }

  openBalanceDialog(user: User, operation: 'add' | 'deduct') {
    const dialogRef = this.dialog.open(BalanceDialogComponent, {
      width: '500px',
      data: { user, operation }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadUsers(); // Refresh user list to show updated balances
      }
    });
  }

  getTotalBalance(): number {
    return this.users.reduce((total, user) => total + user.balance, 0);
  }

  getUsersWithBalance(): number {
    return this.users.filter(user => user.balance > 0).length;
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

  canManageBalance(user: User): boolean {
    return this.authService.canManageUser(user);
  }
}