import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { BalanceService } from '../../services/balance.service';
import { User, UserStats } from '../../models/user.model';
import { TransactionStats } from '../../models/transaction.model';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  currentUser: User | null = null;
  userStats: UserStats | null = null;
  transactionStats: TransactionStats | null = null;
  isLoadingStats = false;

  constructor(
    public authService: AuthService,
    private userService: UserService,
    private balanceService: BalanceService
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user && this.canViewStats()) {
        this.loadStats();
      }
    });
  }

  loadStats() {
    if (!this.canViewStats()) return;
    
    this.isLoadingStats = true;
    
    // Load user stats
    this.userService.getUserStats().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.userStats = response.data;
        }
      },
      error: (error) => {
        console.error('Error loading user stats:', error);
      }
    });

    // Load transaction stats
    this.balanceService.getTransactionStats().subscribe({
      next: (response) => {
        this.isLoadingStats = false;
        if (response.success && response.data) {
          this.transactionStats = response.data;
        }
      },
      error: (error) => {
        this.isLoadingStats = false;
        console.error('Error loading transaction stats:', error);
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

  canAccessUsers(): boolean {
    return this.authService.hasRole(['admin', 'super_admin']);
  }

  canAccessBalance(): boolean {
    return this.authService.hasRole(['admin', 'super_admin']);
  }

  canViewStats(): boolean {
    return this.authService.hasRole(['admin', 'super_admin']);
  }

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  getDaysAsMember(): number {
    if (!this.currentUser) return 0;
    const createdDate = new Date(this.currentUser.createdAt);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - createdDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}