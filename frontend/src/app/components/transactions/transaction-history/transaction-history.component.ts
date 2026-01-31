import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormControl } from '@angular/forms';

import { Transaction } from '../../../models/transaction.model';
import { BalanceService } from '../../../services/balance.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-transaction-history',
  templateUrl: './transaction-history.component.html',
  styleUrls: ['./transaction-history.component.scss']
})
export class TransactionHistoryComponent implements OnInit {
  displayedColumns: string[] = ['reference', 'type', 'amount', 'description', 'performedBy', 'createdAt'];
  dataSource = new MatTableDataSource<Transaction>();
  isLoading = false;
  totalTransactions = 0;
  pageSize = 10;
  currentPage = 0;
  
  // Filters
  typeFilter = '';
  startDateControl = new FormControl();
  endDateControl = new FormControl();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private balanceService: BalanceService,
    public authService: AuthService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.loadTransactions();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadTransactions() {
    this.isLoading = true;
    
    const params: any = {
      page: (this.currentPage + 1).toString(),
      limit: this.pageSize.toString(),
      sortBy: 'createdAt',
      sortOrder: 'desc'
    };
    
    if (this.typeFilter) {
      params.type = this.typeFilter;
    }
    
    if (this.startDateControl.value) {
      params.startDate = this.startDateControl.value.toISOString();
    }
    
    if (this.endDateControl.value) {
      params.endDate = this.endDateControl.value.toISOString();
    }

    this.balanceService.getCurrentUserTransactionHistory(params).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success && response.data) {
          this.dataSource.data = response.data.transactions;
          this.totalTransactions = response.data.pagination.totalTransactions;
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error loading transactions:', error);
        this.snackBar.open('Failed to load transactions', 'Close', { duration: 3000 });
      }
    });
  }

  onPageChange(event: any) {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadTransactions();
  }

  applyFilter() {
    this.currentPage = 0;
    this.loadTransactions();
  }

  clearFilters() {
    this.typeFilter = '';
    this.startDateControl.setValue(null);
    this.endDateControl.setValue(null);
    this.currentPage = 0;
    this.loadTransactions();
  }

  exportTransactions() {
    // This would typically generate a CSV or PDF export
    this.snackBar.open('Export functionality coming soon', 'Close', { duration: 3000 });
  }

  getTransactionTypeIcon(type: string): string {
    return type === 'credit' ? 'add_circle' : 'remove_circle';
  }

  getTransactionTypeClass(type: string): string {
    return type === 'credit' ? 'transaction-credit' : 'transaction-debit';
  }

  getTransactionSign(type: string): string {
    return type === 'credit' ? '+' : '-';
  }
}