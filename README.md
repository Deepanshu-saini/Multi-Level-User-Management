# Multi-Level User Management System

A comprehensive user management system with hierarchical user roles, authentication, and balance management features.

## Features

### 1. Authentication (Express + JWT + Cookies + CAPTCHA)
- User registration and login
- JWT token-based authentication
- HTTP-only cookies for security
- CAPTCHA integration for bot protection
- Password hashing with bcrypt

### 2. User Hierarchy & Permissions
- **Super Admin**: Full system access, can manage all users
- **Admin**: Can manage regular users and moderators
- **Moderator**: Can view and moderate content
- **User**: Basic access with limited permissions

### 3. Balance Management
- Add/deduct balance functionality
- Transaction history tracking
- Balance validation and limits
- Audit trail for all balance operations

### 4. Admin Features
- User management dashboard
- Role assignment and modification
- System monitoring and analytics
- Bulk operations support

### 5. Frontend Interface (Angular)
- Responsive design with Angular Material
- Role-based UI components
- Real-time updates
- Form validation and error handling

## Tech Stack

**Backend:**
- Node.js with Express.js
- MongoDB with Mongoose
- JWT for authentication
- bcrypt for password hashing
- express-rate-limit for security

**Frontend:**
- Angular 16+
- Angular Material UI
- RxJS for reactive programming
- Angular Guards for route protection

## Installation

1. Clone the repository
```bash
git clone <repository-url>
cd multi-level-user-management
```

2. Install backend dependencies
```bash
cd backend
npm install
```

3. Install frontend dependencies
```bash
cd ../frontend
npm install
```

4. Set up environment variables
```bash
cp backend/.env.example backend/.env
# Edit .env with your configuration
```

5. Start the development servers
```bash
# Backend (from backend directory)
npm run dev

# Frontend (from frontend directory)
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/verify` - Verify JWT token

### User Management
- `GET /api/users` - Get all users (Admin only)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user (Admin only)

### Balance Management
- `POST /api/balance/add` - Add balance
- `POST /api/balance/deduct` - Deduct balance
- `GET /api/balance/history/:userId` - Get transaction history

## Environment Variables

```
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/user-management
JWT_SECRET=your-jwt-secret
JWT_EXPIRE=7d
BCRYPT_ROUNDS=12
```

## License

MIT License