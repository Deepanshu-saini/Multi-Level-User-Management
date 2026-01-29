import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { LoginComponent } from './components/auth/login/login.component';
import { RegisterComponent } from './components/auth/register/register.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { UserListComponent } from './components/users/user-list/user-list.component';
import { ProfileComponent } from './components/profile/profile.component';
import { TransactionHistoryComponent } from './components/transactions/transaction-history/transaction-history.component';
import { BalanceManagementComponent } from './components/balance/balance-management/balance-management.component';

import { AuthGuard } from './guards/auth.guard';
import { RoleGuard } from './guards/role.guard';

const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { 
    path: 'dashboard', 
    component: DashboardComponent, 
    canActivate: [AuthGuard] 
  },
  { 
    path: 'users', 
    component: UserListComponent, 
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['admin', 'super_admin'] }
  },
  { 
    path: 'profile', 
    component: ProfileComponent, 
    canActivate: [AuthGuard] 
  },
  { 
    path: 'transactions', 
    component: TransactionHistoryComponent, 
    canActivate: [AuthGuard] 
  },
  { 
    path: 'balance', 
    component: BalanceManagementComponent, 
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['admin', 'super_admin'] }
  },
  { path: '**', redirectTo: '/dashboard' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }