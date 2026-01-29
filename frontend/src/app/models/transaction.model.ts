import { User } from './user.model';

export interface Transaction {
  _id: string;
  userId: User;
  type: 'credit' | 'debit';
  amount: number;
  previousBalance: number;
  newBalance: number;
  description: string;
  performedBy: User;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  reference: string;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransactionListResponse {
  transactions: Transaction[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalTransactions: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    limit: number;
  };
}

export interface TransactionSummary {
  totalCredits: number;
  totalDebits: number;
  creditCount: number;
  debitCount: number;
  netAmount: number;
}

export interface TransactionStats {
  statistics: {
    totalTransactions: number;
    totalCredits: number;
    totalDebits: number;
    creditCount: number;
    debitCount: number;
  };
  totalBalance: number;
}

export interface BalanceOperation {
  userId: string;
  amount: number;
  description: string;
}