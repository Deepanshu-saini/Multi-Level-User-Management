# Multi-Level User Management System

A full-stack web application for managing users in a hierarchical structure with role-based permissions, balance management, and comprehensive transaction tracking. Perfect for businesses that need to manage multi-level user relationships, track financial transactions, and maintain strict access controls.

## What This System Does

Think of this as a complete user management platform where users can create and manage their own network of sub-users. Each user can only see and manage users they've created (their "downline"), creating a natural hierarchy. The system handles everything from secure authentication to balance transfers, with automatic tracking of who created whom and who can manage what.

## Key Features

### 🔐 Secure Authentication
We've built a robust authentication system that keeps your data safe. Users log in with a CAPTCHA to prevent bots, and the system automatically locks accounts after multiple failed attempts. All passwords are encrypted using industry-standard bcrypt hashing, and we use JWT tokens stored in secure HTTP-only cookies.

### 👥 Hierarchical User Management
This is where the system really shines. Users can create other users, and those relationships form a tree structure. Here's how it works:

- **Super Admins** can see and manage everyone in the system
- **Admins** can manage users, moderators, and other admins
- **Regular users** can only see and manage users they've created (their downline)
- Each user can only create users at their "next level" - maintaining the hierarchy

When you create a user, they automatically become part of your downline. You can view your entire network in a beautiful tree structure, click on any user to see their hierarchy, and manage passwords for users you've created.

### 💰 Balance Management
The system includes a complete financial management module. Users can:

- Add balance to any user in their hierarchy
- Deduct balance when needed
- View complete transaction history with pagination
- See detailed statements showing all credits and debits

Here's the clever part: when you credit balance to a user, the system automatically deducts it from that user's immediate parent. This ensures the money flows correctly through the hierarchy and maintains proper accounting.

### 📊 Transaction Tracking
Every financial transaction is logged with complete details:
- Who performed the action
- Who received or sent the balance
- Timestamp and description
- Previous and new balance amounts

This creates a complete audit trail that you can review at any time.

### 🎨 Modern User Interface
The frontend is built with Angular and Material Design, giving you a clean, responsive interface that works great on desktop, tablet, and mobile devices. The UI adapts based on your role, showing only the features you have permission to use.

## Technology Stack

**Backend:**
- Node.js with Express.js for the API server
- MongoDB with Mongoose for data persistence
- JWT for secure token-based authentication
- bcrypt for password hashing
- express-rate-limit for protection against brute force attacks
- svg-captcha for CAPTCHA generation

**Frontend:**
- Angular 16+ with TypeScript
- Angular Material for beautiful UI components
- RxJS for reactive programming
- SCSS for styling

## Getting Started

### Prerequisites

Before you begin, make sure you have:
- Node.js version 16 or higher installed
- MongoDB version 4.4 or higher running (local or cloud)
- npm or yarn package manager

### Installation

1. **Clone the repository** (or download the project files)

2. **Install backend dependencies:**
   ```bash
   cd backend
   npm install
   ```

3. **Install frontend dependencies:**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Set up environment variables:**

   Create a `.env` file in the `backend` directory:
   ```env
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/usermanagement
   JWT_SECRET=your-super-secret-jwt-key-here
   JWT_EXPIRE=7d
   SESSION_SECRET=your-session-secret-here
   NODE_ENV=development
   CORS_ORIGIN=http://localhost:4200
   ```

   Create a `environment.ts` file in `frontend/src/environments/`:
   ```typescript
   export const environment = {
     production: false,
     apiUrl: 'http://localhost:3000/api'
   };
   ```

5. **Seed the database** (optional, but recommended for testing):
   ```bash
   cd backend
   node scripts/seed.js
   ```

6. **Start the backend server:**
   ```bash
   cd backend
   npm start
   ```
   The API will be available at `http://localhost:3000`

7. **Start the frontend development server:**
   ```bash
   cd frontend
   ng serve
   ```
   The application will be available at `http://localhost:4200`

### Default Login Credentials

After running the seed script, you can log in with these accounts:

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@example.com | Admin123! |
| Admin | john@example.com | Admin123! |
| Moderator | jane@example.com | Moderator123! |
| User | bob@example.com | User123! |

**Important:** Change these passwords immediately in a production environment!

## How to Use

### Creating Users

1. Log in as an admin or super admin
2. Navigate to the "User Management" page
3. Click "Add User"
4. Fill in the user details (username, email, password, role)
5. The new user will automatically be added to your downline

### Viewing User Hierarchy

1. Go to the User Management page
2. Click on any user row to view their complete downline hierarchy
3. Or use the menu (⋮) and select "View Hierarchy"
4. The tree view shows all users in that person's network

### Managing Balance

1. Navigate to "Balance Management"
2. Search for a user in your hierarchy
3. Click "Add Balance" or "Deduct Balance"
4. Enter the amount and description
5. When crediting, the balance is automatically deducted from the user's immediate parent

### Changing Passwords

- Users can change their own password from the Profile page
- Admins can change passwords for users in their downline
- Use the user menu to access password change options

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user (optionally authenticated to set hierarchy)
- `POST /api/auth/login` - Login with CAPTCHA verification
- `POST /api/auth/logout` - Logout and clear session
- `GET /api/auth/verify` - Verify JWT token validity
- `GET /api/auth/captcha` - Get CAPTCHA image for login
- `PUT /api/auth/change-password/:userId` - Change password for downline users

### User Management
- `GET /api/users` - Get users (filtered by role and hierarchy)
- `GET /api/users/:id` - Get specific user details
- `PUT /api/users/:id` - Update user information
- `DELETE /api/users/:id` - Delete user (admin only)
- `GET /api/users/profile/me` - Get current user's profile
- `PUT /api/users/profile/me` - Update current user's profile
- `GET /api/users/:id/downline` - Get user's downline (flat list)
- `GET /api/users/:id/downline/tree` - Get user's downline (tree structure)
- `GET /api/users/:id/next-level` - Get direct children only

### Balance Management
- `POST /api/balance/add` - Add balance to a user (deducts from parent)
- `POST /api/balance/deduct` - Deduct balance from a user
- `GET /api/balance/history/me` - Get current user's transaction history
- `GET /api/balance/history/:userId` - Get user's transaction history
- `GET /api/balance/summary/:userId` - Get balance summary

## Security Features

We take security seriously. Here's what's built in:

- **JWT Authentication** with HTTP-only cookies (prevents XSS attacks)
- **Password Hashing** using bcrypt with 12 rounds
- **CAPTCHA Protection** on login (expires after 5 minutes)
- **Rate Limiting** - 100 requests per 15 minutes per IP
- **Account Lockout** - 5 failed attempts locks account for 2 hours
- **Input Validation** - All inputs are validated and sanitized
- **CORS Protection** - Only allowed origins can access the API
- **Role-Based Access Control** - Users can only access what they're allowed to

## Project Structure

```
multi-level-user-management/
├── backend/
│   ├── middleware/          # Authentication & validation logic
│   ├── models/             # MongoDB schemas (User, Transaction)
│   ├── routes/             # API route handlers
│   ├── scripts/            # Database seeding & utility scripts
│   ├── utils/              # Helper functions (downline queries, etc.)
│   ├── server.js           # Express server entry point
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/  # Angular components (login, dashboard, etc.)
│   │   │   ├── guards/     # Route protection guards
│   │   │   ├── interceptors/ # HTTP request/response interceptors
│   │   │   ├── models/     # TypeScript interfaces
│   │   │   └── services/   # API service classes
│   │   └── environments/   # Environment configurations
│   ├── angular.json
│   └── package.json
├── README.md
└── package.json
```

## Common Issues and Solutions

### MongoDB Connection Error
**Problem:** Can't connect to MongoDB

**Solution:**
- Make sure MongoDB is running: `mongod` or check your MongoDB service
- Verify the connection string in your `.env` file
- If using MongoDB Atlas, check your IP whitelist and connection string

### Port Already in Use
**Problem:** Error saying port 3000 or 4200 is already in use

**Solution:**
- Change the PORT in your `.env` file
- Or kill the process using the port:
  ```bash
  # Windows
  netstat -ano | findstr :3000
  taskkill /PID <PID> /F
  
  # Mac/Linux
  lsof -ti:3000 | xargs kill
  ```

### CORS Issues
**Problem:** Frontend can't make requests to backend

**Solution:**
- Ensure `CORS_ORIGIN` in `.env` matches your frontend URL (e.g., `http://localhost:4200`)
- Check that the backend is running and accessible

### JWT Token Issues
**Problem:** Getting "Invalid token" or "Token expired" errors

**Solution:**
- Clear your browser cookies
- Make sure `JWT_SECRET` in `.env` is set and consistent
- Check that your system clock is correct (JWT uses timestamps)

### Users Not Showing in Hierarchy
**Problem:** Created a user but they don't appear in your downline

**Solution:**
- Make sure you were logged in when creating the user
- Check that the `createdBy` field is set correctly in the database
- Run the hierarchy check script: `node backend/scripts/check-hierarchy.js`

## Development Tips

- **Hot Reload:** Both frontend and backend support hot reload during development
- **Database Seeding:** Use the seed script to quickly populate test data
- **API Testing:** Use Postman or curl to test API endpoints directly
- **Debugging:** Check browser console for frontend errors and terminal for backend logs

## Production Deployment

When deploying to production, we've created comprehensive deployment guides:

### Quick Start
- **Quick Deployment Checklist**: See [`QUICK_DEPLOY.md`](QUICK_DEPLOY.md) for a step-by-step checklist
- **Detailed Guide**: See [`DEPLOYMENT_GUIDE.md`](DEPLOYMENT_GUIDE.md) for complete instructions with troubleshooting

### Deployment Overview

**Backend (Render):**
1. Set up MongoDB Atlas (free tier available)
2. Deploy backend to Render with environment variables
3. Configure CORS to allow your frontend domain

**Frontend (Vercel):**
1. Update `environment.prod.ts` with your backend URL
2. Deploy to Vercel (automatic from GitHub)
3. Update CORS in Render with your Vercel URL

**Post-Deployment:**
1. Create initial admin user via API
2. Test all features
3. Set up monitoring and alerts

For detailed step-by-step instructions, troubleshooting, and security considerations, see the deployment guides mentioned above.
7. Configure CORS to only allow your production domain
8. Regularly update dependencies for security patches

## Contributing

We welcome contributions! Here's how you can help:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test thoroughly
5. Commit with clear messages (`git commit -m 'Add amazing feature'`)
6. Push to your branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

If you run into any issues or have questions:

1. Check the troubleshooting section above
2. Review the code comments and documentation
3. Open an issue on GitHub with details about your problem
4. Include error messages, steps to reproduce, and your environment details

---

**Built with ❤️ using Node.js, Express, MongoDB, and Angular**

*Last updated: 2024*
