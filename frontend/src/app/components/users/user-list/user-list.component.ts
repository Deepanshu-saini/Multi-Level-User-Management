import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { User } from '../../../models/user.model';
import { UserService } from '../../../services/user.service';
import { AuthService } from '../../../services/auth.service';
import { UserDialogComponent } from '../user-dialog/user-dialog.component';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';
import { UserHierarchyComponent } from '../user-hierarchy/user-hierarchy.component';

@Component({
  selector: 'app-user-list',
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.scss']
})
export class UserListComponent implements OnInit {
  displayedColumns: string[] = ['username', 'email', 'role', 'balance', 'isActive', 'createdAt', 'actions'];
  dataSource = new MatTableDataSource<User>();
  isLoading = false;
  totalUsers = 0;
  pageSize = 10;
  currentPage = 0;
  
  // Filters
  roleFilter = '';
  statusFilter = '';
  searchTerm = '';

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private userService: UserService,
    public authService: AuthService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.loadUsers();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadUsers() {
    this.isLoading = true;
    
    const params: any = {
      page: this.currentPage + 1,
      limit: this.pageSize,
      ...(this.roleFilter && { role: this.roleFilter }),
      ...(this.statusFilter !== '' && { isActive: this.statusFilter === 'active' }),
      ...(this.searchTerm && { search: this.searchTerm }),
      sortBy: 'createdAt',
      sortOrder: 'desc'
    };
    
    // Ensure isActive is sent as boolean string for query params
    if (params.isActive !== undefined) {
      params.isActive = params.isActive.toString();
    }

    this.userService.getUsers(params).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success && response.data) {
          // Transform users to ensure they have 'id' property (MongoDB returns _id)
          this.dataSource.data = response.data.users.map((user: any) => ({
            ...user,
            id: user.id || user._id || (user._id ? String(user._id) : '')
          }));
          this.totalUsers = response.data.pagination.totalUsers;
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error loading users:', error);
        this.snackBar.open('Failed to load users', 'Close', { duration: 3000 });
      }
    });
  }

  onPageChange(event: any) {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadUsers();
  }

  applyFilter() {
    this.currentPage = 0;
    this.loadUsers();
  }

  clearFilters() {
    this.roleFilter = '';
    this.statusFilter = '';
    this.searchTerm = '';
    this.currentPage = 0;
    this.loadUsers();
  }

  openUserDialog(user?: User) {
    const dialogRef = this.dialog.open(UserDialogComponent, {
      width: '500px',
      data: user ? { ...user } : null
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadUsers();
      }
    });
  }

  deleteUser(user: User) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Delete User',
        message: `Are you sure you want to delete user "${user.username}"? This action cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Cancel'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.userService.deleteUser(user.id).subscribe({
          next: (response) => {
            if (response.success) {
              this.snackBar.open('User deleted successfully', 'Close', { duration: 3000 });
              this.loadUsers();
            }
          },
          error: (error) => {
            console.error('Error deleting user:', error);
            this.snackBar.open(error.error?.message || 'Failed to delete user', 'Close', { duration: 3000 });
          }
        });
      }
    });
  }

  toggleUserStatus(user: User) {
    const newStatus = !user.isActive;
    const action = newStatus ? 'activate' : 'deactivate';
    
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: `${action.charAt(0).toUpperCase() + action.slice(1)} User`,
        message: `Are you sure you want to ${action} user "${user.username}"?`,
        confirmText: action.charAt(0).toUpperCase() + action.slice(1),
        cancelText: 'Cancel'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Ensure isActive is sent as a proper boolean
        const updateData: { isActive: boolean } = { isActive: Boolean(newStatus) };
        
        this.userService.updateUser(user.id, updateData).subscribe({
          next: (response) => {
            if (response.success) {
              this.snackBar.open(`User ${action}d successfully`, 'Close', { duration: 3000 });
              this.loadUsers();
            }
          },
          error: (error) => {
            console.error(`Error ${action}ing user:`, error);
            const errorMessage = error.error?.message || error.error?.errors?.[0]?.message || `Failed to ${action} user`;
            this.snackBar.open(errorMessage, 'Close', { duration: 3000 });
          }
        });
      }
    });
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

  canEditUser(user: User): boolean {
    return this.authService.canManageUser(user);
  }

  canDeleteUser(user: User): boolean {
    const currentUser = this.authService.currentUser;
    if (!currentUser) return false;
    
    // Can't delete yourself
    if (currentUser.id === user.id) return false;
    
    // Can't delete users with positive balance
    if (user.balance > 0) return false;
    
    return this.authService.canManageUser(user);
  }

  viewHierarchy(user?: User) {
    const targetUserId = user?.id || this.authService.currentUser?.id;
    if (!targetUserId) return;

    const dialogRef = this.dialog.open(UserHierarchyComponent, {
      width: '800px',
      maxWidth: '90vw',
      maxHeight: '90vh',
      data: { userId: targetUserId }
    });
  }
}