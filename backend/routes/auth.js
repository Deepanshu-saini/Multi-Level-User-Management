const express = require('express');
const jwt = require('jsonwebtoken');
const svgCaptcha = require('svg-captcha');
const crypto = require('crypto');
const User = require('../models/User');
const { authenticateToken, optionalAuth, requireRole } = require('../middleware/auth');
const { validateRegistration, validateLogin, validatePasswordChange, validateObjectId } = require('../middleware/validation');
const { isInDownline } = require('../utils/downline');

const router = express.Router();

// Simple in-memory store for CAPTCHA (better than sessions for serverless)
const captchaStore = new Map();

// Clean up expired CAPTCHAs every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of captchaStore.entries()) {
    if (now > value.expiresAt) {
      captchaStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

// Generate CAPTCHA
router.get('/captcha', (req, res) => {
  try {
    const captcha = svgCaptcha.create({
      size: 4,
      noise: 2,
      color: true,
      background: '#f0f0f0'
    });
    
    // Generate a unique CAPTCHA ID
    const captchaId = crypto.randomBytes(16).toString('hex');
    
    // Store CAPTCHA text and expiry time (5 minutes)
    captchaStore.set(captchaId, {
      text: captcha.text.toLowerCase(),
      expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes from now
    });
    
    // Return both the SVG and the CAPTCHA ID
    res.status(200).json({
      success: true,
      data: {
        captchaSvg: captcha.data,
        captchaId: captchaId
      }
    });
  } catch (error) {
    console.error('CAPTCHA generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate CAPTCHA'
    });
  }
});

// User registration (optionally authenticated - if logged in, sets createdBy for hierarchy)
router.post('/register', optionalAuth, validateRegistration, async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: existingUser.email === email ? 'Email already registered' : 'Username already taken'
      });
    }
    
    // Create new user
    const userData = { username, email, password };
    
    // If user is authenticated (creating another user), set createdBy to establish hierarchy
    if (req.user && req.user._id) {
      // ALWAYS set createdBy when authenticated user creates another user
      // This establishes the parent-child relationship in the hierarchy
      userData.createdBy = req.user._id;
      
      // Role assignment logic based on creator's role:
      // - Super admin can assign any role
      // - Admin can assign user, moderator, admin (but not super_admin)
      // - Regular users can only create 'user' role (their next level)
      if (role) {
        if (req.user.role === 'super_admin') {
          userData.role = role;
        } else if (req.user.role === 'admin' && ['user', 'moderator', 'admin'].includes(role)) {
          userData.role = role;
        } else if (!['admin', 'super_admin'].includes(req.user.role) && role === 'user') {
          // Regular users can only create 'user' role (their next level)
          userData.role = 'user';
        } else {
          return res.status(403).json({
            success: false,
            message: 'You do not have permission to assign this role. You can only create users in your next level.'
          });
        }
      } else {
        // Default role based on creator's permissions
        if (req.user.role === 'super_admin') {
          userData.role = 'user'; // Default for super admin
        } else if (req.user.role === 'admin') {
          userData.role = 'user'; // Default for admin
        } else {
          userData.role = 'user'; // Regular users can only create 'user' role
        }
      }
    } else {
      // Public registration (no authenticated user) - default to 'user' role
      // No parent for public registrations (they become root users)
      userData.role = role || 'user';
      userData.createdBy = null;
    }
    
    const user = new User(userData);
    await user.save();
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
    
    // Set HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user._id ? String(user._id) : user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          balance: user.balance,
          isActive: user.isActive,
          createdAt: user.createdAt
        },
        token
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// User login
router.post('/login', validateLogin, async (req, res) => {
  try {
    const { email, password, captcha, captchaId } = req.body;
    
    // Verify CAPTCHA using ID from request body
    if (!captchaId) {
      return res.status(400).json({
        success: false,
        message: 'CAPTCHA ID not found. Please refresh the CAPTCHA.'
      });
    }
    
    const captchaData = captchaStore.get(captchaId);
    
    if (!captchaData) {
      return res.status(400).json({
        success: false,
        message: 'CAPTCHA not found. Please refresh the CAPTCHA.'
      });
    }
    
    // Check if CAPTCHA has expired (5 minutes)
    if (Date.now() > captchaData.expiresAt) {
      captchaStore.delete(captchaId);
      return res.status(400).json({
        success: false,
        message: 'CAPTCHA has expired. Please refresh and try again.'
      });
    }
    
    // Verify CAPTCHA text
    if (captcha.toLowerCase() !== captchaData.text) {
      return res.status(400).json({
        success: false,
        message: 'Invalid CAPTCHA'
      });
    }
    
    // Clear CAPTCHA after successful verification
    captchaStore.delete(captchaId);
    
    // Find user by email
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Check if account is locked
    if (user.isLocked) {
      return res.status(423).json({
        success: false,
        message: 'Account is temporarily locked due to too many failed login attempts'
      });
    }
    
    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }
    
    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      // Increment login attempts
      await user.incLoginAttempts();
      
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Reset login attempts on successful login
    if (user.loginAttempts > 0) {
      await user.resetLoginAttempts();
    }
    
    // Update last login
    user.lastLogin = new Date();
    await user.save();
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
    
    // Set HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id ? String(user._id) : user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          balance: user.balance,
          isActive: user.isActive,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt
        },
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// User logout
router.post('/logout', (req, res) => {
  try {
    // Clear the token cookie
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    });
    
    res.status(200).json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
});

// Verify token and get current user
router.get('/verify', authenticateToken, async (req, res) => {
  try {
    // Ensure user is authenticated and has a valid ID
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

          res.status(200).json({
            success: true,
            message: 'Token is valid',
            data: {
              user: {
                id: req.user._id ? String(req.user._id) : req.user.id,
                username: req.user.username,
                email: req.user.email,
                role: req.user.role,
                balance: req.user.balance,
                isActive: req.user.isActive,
                lastLogin: req.user.lastLogin,
                createdAt: req.user.createdAt
              }
            }
          });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Token verification failed'
    });
  }
});

// Change password (self)
router.put('/change-password', authenticateToken, validatePasswordChange, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Verify current password
    const isCurrentPasswordValid = await req.user.comparePassword(currentPassword);
    
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }
    
    // Update password
    req.user.password = newPassword;
    await req.user.save();
    
    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({
      success: false,
      message: 'Password change failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Change password for downline user
router.put('/change-password/:userId', authenticateToken, validateObjectId('userId'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;
    
    // Validate new password
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }
    
    // Check if target user is in current user's downline
    const targetIsInDownline = await isInDownline(req.user._id, userId);
    
    if (!targetIsInDownline) {
      return res.status(403).json({
        success: false,
        message: 'You can only change password for users in your downline'
      });
    }
    
    // Get target user
    const targetUser = await User.findById(userId);
    
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Update password
    targetUser.password = newPassword;
    await targetUser.save();
    
    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
      data: {
        userId: targetUser._id,
        username: targetUser.username
      }
    });
  } catch (error) {
    console.error('Change downline password error:', error);
    res.status(500).json({
      success: false,
      message: 'Password change failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Refresh token
router.post('/refresh', authenticateToken, (req, res) => {
  try {
    // Generate new JWT token
    const token = jwt.sign(
      { userId: req.user._id, role: req.user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
    
    // Set new HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: { token }
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      message: 'Token refresh failed'
    });
  }
});

module.exports = router;