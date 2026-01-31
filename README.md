# Multi-Level User Management System

A comprehensive user management system with hierarchical user roles, authentication, and balance management features built with Node.js, Express, MongoDB, and Angular.

## 🚀 Features

### 🔐 Authentication System
- **JWT Token Authentication** with HTTP-only cookies
- **CAPTCHA Integration** for enhanced security
- **Password Hashing** with bcrypt
- **Rate Limiting** to prevent brute force attacks
- **Account Lockout** after failed login attempts

### 👥 User Hierarchy & Permissions
- **Super Admin**: Full system access, can manage all users
- **Admin**: Can manage regular users and moderators
- **Moderator**: Can view and moderate content
- **User**: Basic access with limited permissions

### 💰 Balance Management
- Add/deduct balance functionality
- Transaction history tracking
- Balance validation and limits
- Comprehensive audit trail

### 🎛️ Admin Features
- User management dashboard
- Role assignment and modification
- System monitoring and analytics
- Bulk operations support

### 🖥️ Frontend Interface
- **Angular 16+** with Material Design
- Responsive design for all devices
- Role-based UI components
- Real-time updates and notifications

## 🛠️ Tech Stack

**Backend:**
- Node.js with Express.js
- MongoDB with Mongoose ODM
- JWT for authentication
- bcrypt for password hashing
- express-rate-limit for security
- CAPTCHA with svg-captcha

**Frontend:**
- Angular 16+
- Angular Material UI
- RxJS for reactive programming
- TypeScript
- SCSS for styling

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn package manager

## 🚀 Quick Start

### For Local Development
See [dev-setup.md](dev-setup.md) for local development instructions.

### For Production Deployment
See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions on Render and Vercel.

## 👤 Default Login Credentials

After running the seed script:

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@example.com | Admin123! |
| Admin | john@example.com | Admin123! |
| Moderator | jane@example.com | Moderator123! |
| User | bob@example.com | User123! |

## 📚 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/verify` - Verify JWT token
- `GET /api/auth/captcha` - Get CAPTCHA image

### User Management
- `GET /api/users` - Get all users (Admin only)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user (Admin only)

### Balance Management
- `POST /api/balance/add` - Add balance
- `POST /api/balance/deduct` - Deduct balance
- `GET /api/balance/history/:userId` - Get transaction history

## 🔒 Security Features

- **JWT Authentication** with HTTP-only cookies
- **Password Hashing** with bcrypt (12 rounds)
- **CAPTCHA Protection** on login
- **Rate Limiting** (100 requests per 15 minutes)
- **Account Lockout** (5 failed attempts = 2 hour lock)
- **Input Validation** and sanitization
- **CORS Protection**
- **Security Headers** with Helmet.js

## 🏗️ Project Structure

```
multi-level-user-management/
├── backend/
│   ├── middleware/          # Authentication & validation middleware
│   ├── models/             # MongoDB models
│   ├── routes/             # API routes
│   ├── scripts/            # Database seeding scripts
│   ├── server.js           # Express server setup
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/ # Angular components
│   │   │   ├── guards/     # Route guards
│   │   │   ├── interceptors/ # HTTP interceptors
│   │   │   ├── models/     # TypeScript interfaces
│   │   │   └── services/   # Angular services
│   │   └── environments/   # Environment configurations
│   ├── angular.json
│   └── package.json
├── README.md
└── package.json
```

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## 🚀 Production Deployment

1. Set `NODE_ENV=production`
2. Use a production MongoDB instance
3. Set secure JWT_SECRET and SESSION_SECRET
4. Enable HTTPS
5. Use a reverse proxy (nginx)
6. Set up proper logging and monitoring

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🐛 Troubleshooting

### Common Issues

**MongoDB Connection Error**
- Ensure MongoDB is running
- Check the connection string in `.env`

**Port Already in Use**
- Change the PORT in `.env` file
- Kill the process: `netstat -ano | findstr :3000` then `taskkill /PID <PID> /F`

**CORS Issues**
- Ensure CORS_ORIGIN in `.env` matches your frontend URL

**JWT Token Issues**
- Clear browser cookies
- Check JWT_SECRET in `.env`

## 📞 Support

If you have any questions or need help, please open an issue on GitHub.

---

**Built with ❤️ using Node.js, Express, MongoDB, and Angular**