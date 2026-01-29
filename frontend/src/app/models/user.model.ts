export interface User {
  id: string;
  username: string;
  email: string;
  role: 'user' | 'moderator' | 'admin' | 'super_admin';
  balance: number;
  isActive: boolean;
  createdBy?: string;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt?: Date;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  role?: string;
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  role?: string;
  isActive?: boolean;
}

export interface UserListResponse {
  users: User[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalUsers: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    limit: number;
  };
}

export interface UserStats {
  overview: {
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    recentRegistrations: number;
  };
  roleStats: Array<{
    _id: string;
    count: number;
    totalBalance: number;
    activeUsers: number;
  }>;
}