import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { User, UserListResponse, UserStats, CreateUserRequest, UpdateUserRequest } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly API_URL = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getUsers(params?: {
    page?: number;
    limit?: number;
    role?: string;
    isActive?: boolean;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
  }): Observable<ApiResponse<UserListResponse>> {
    let httpParams = new HttpParams();
    
    if (params) {
      Object.keys(params).forEach(key => {
        const value = params[key as keyof typeof params];
        if (value !== undefined && value !== null) {
          httpParams = httpParams.set(key, value.toString());
        }
      });
    }

    return this.http.get<ApiResponse<UserListResponse>>(`${this.API_URL}/users`, { params: httpParams });
  }

  getUserById(id: string): Observable<ApiResponse<{ user: User }>> {
    return this.http.get<ApiResponse<{ user: User }>>(`${this.API_URL}/users/${id}`);
  }

  createUser(userData: CreateUserRequest): Observable<ApiResponse<{ user: User }>> {
    return this.http.post<ApiResponse<{ user: User }>>(`${this.API_URL}/auth/register`, userData);
  }

  updateUser(id: string, userData: UpdateUserRequest): Observable<ApiResponse<{ user: User }>> {
    return this.http.put<ApiResponse<{ user: User }>>(`${this.API_URL}/users/${id}`, userData);
  }

  deleteUser(id: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.API_URL}/users/${id}`);
  }

  getUserStats(): Observable<ApiResponse<UserStats>> {
    return this.http.get<ApiResponse<UserStats>>(`${this.API_URL}/users/stats/overview`);
  }

  getCurrentUserProfile(): Observable<ApiResponse<{ user: User }>> {
    return this.http.get<ApiResponse<{ user: User }>>(`${this.API_URL}/users/profile/me`);
  }

  updateCurrentUserProfile(userData: { username?: string; email?: string }): Observable<ApiResponse<{ user: User }>> {
    return this.http.put<ApiResponse<{ user: User }>>(`${this.API_URL}/users/profile/me`, userData);
  }

  getDownline(userId: string): Observable<ApiResponse<{ downline: User[]; count: number }>> {
    return this.http.get<ApiResponse<{ downline: User[]; count: number }>>(`${this.API_URL}/users/${userId}/downline`);
  }

  getDownlineTree(userId: string): Observable<ApiResponse<{ tree: any }>> {
    return this.http.get<ApiResponse<{ tree: any }>>(`${this.API_URL}/users/${userId}/downline/tree`);
  }

  getNextLevelUsers(userId: string): Observable<ApiResponse<{ users: User[]; count: number }>> {
    return this.http.get<ApiResponse<{ users: User[]; count: number }>>(`${this.API_URL}/users/${userId}/next-level`);
  }
}