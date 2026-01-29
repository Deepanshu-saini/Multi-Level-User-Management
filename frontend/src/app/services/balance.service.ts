import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { 
  Transaction, 
  TransactionListResponse, 
  TransactionSummary, 
  TransactionStats, 
  BalanceOperation 
} from '../models/transaction.model';

@Injectable({
  providedIn: 'root'
})
export class BalanceService {
  private readonly API_URL = environment.apiUrl;

  constructor(private http: HttpClient) {}

  addBalance(operation: BalanceOperation): Observable<ApiResponse<{ transaction: Transaction; newBalance: number }>> {
    return this.http.post<ApiResponse<{ transaction: Transaction; newBalance: number }>>(
      `${this.API_URL}/balance/add`,
      operation
    );
  }

  deductBalance(operation: BalanceOperation): Observable<ApiResponse<{ transaction: Transaction; newBalance: number }>> {
    return this.http.post<ApiResponse<{ transaction: Transaction; newBalance: number }>>(
      `${this.API_URL}/balance/deduct`,
      operation
    );
  }

  getTransactionHistory(userId: string, params?: {
    page?: number;
    limit?: number;
    type?: string;
    startDate?: string;
    endDate?: string;
    sortBy?: string;
    sortOrder?: string;
  }): Observable<ApiResponse<TransactionListResponse>> {
    let httpParams = new HttpParams();
    
    if (params) {
      Object.keys(params).forEach(key => {
        const value = params[key as keyof typeof params];
        if (value !== undefined && value !== null) {
          httpParams = httpParams.set(key, value.toString());
        }
      });
    }

    return this.http.get<ApiResponse<TransactionListResponse>>(
      `${this.API_URL}/balance/history/${userId}`,
      { params: httpParams }
    );
  }

  getCurrentUserTransactionHistory(params?: {
    page?: number;
    limit?: number;
    type?: string;
    startDate?: string;
    endDate?: string;
    sortBy?: string;
    sortOrder?: string;
  }): Observable<ApiResponse<TransactionListResponse>> {
    let httpParams = new HttpParams();
    
    if (params) {
      Object.keys(params).forEach(key => {
        const value = params[key as keyof typeof params];
        if (value !== undefined && value !== null) {
          httpParams = httpParams.set(key, value.toString());
        }
      });
    }

    return this.http.get<ApiResponse<TransactionListResponse>>(
      `${this.API_URL}/balance/history/me`,
      { params: httpParams }
    );
  }

  getTransactionSummary(userId: string, startDate?: string, endDate?: string): Observable<ApiResponse<{ summary: TransactionSummary; currentBalance: number }>> {
    let httpParams = new HttpParams();
    
    if (startDate) httpParams = httpParams.set('startDate', startDate);
    if (endDate) httpParams = httpParams.set('endDate', endDate);

    return this.http.get<ApiResponse<{ summary: TransactionSummary; currentBalance: number }>>(
      `${this.API_URL}/balance/summary/${userId}`,
      { params: httpParams }
    );
  }

  getTransactionStats(startDate?: string, endDate?: string): Observable<ApiResponse<TransactionStats>> {
    let httpParams = new HttpParams();
    
    if (startDate) httpParams = httpParams.set('startDate', startDate);
    if (endDate) httpParams = httpParams.set('endDate', endDate);

    return this.http.get<ApiResponse<TransactionStats>>(
      `${this.API_URL}/balance/stats/overview`,
      { params: httpParams }
    );
  }

  getTransactionByReference(reference: string): Observable<ApiResponse<{ transaction: Transaction }>> {
    return this.http.get<ApiResponse<{ transaction: Transaction }>>(
      `${this.API_URL}/balance/transaction/${reference}`
    );
  }
}