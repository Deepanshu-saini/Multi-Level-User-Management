const express = require('express');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { authenticateToken, requireRole, canManageUser } = require('../middleware/auth');
const { validateUserUpdate, validateUserQuery, validateObjectId } = require('../middleware/validation');
const { getDownline, getDownlineTree, isInDownline, getNextLevelUsers } = require('../utils/downline');

const router = express.Router();

// Get all users (with pagination and filtering)
// All authenticated users can access, but results are filtered based on role
router.get('/', authenticateToken, validateUserQuery, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      role,
      isActive,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    // Build query based on user role
    let query = {};
    
    // Super admin can see all users
    if (req.user.role === 'super_admin') {
      // No restrictions - can see all users
    }
    // Admin can see users they can manage (user, moderator, admin)
    else if (req.user.role === 'admin') {
      query.role = { $in: ['user', 'moderator', 'admin'] };
    }
    // Regular users and moderators can only see their downline
    else {
      // Get all users in the current user's downline
      const downline = await getDownline(req.user._id, false);
      const downlineIds = downline.map(u => u._id);
      
      // If no downline, return empty result
      if (downlineIds.length === 0) {
        return res.status(200).json({
          success: true,
          message: 'Users retrieved successfully',
          data: {
            users: [],
            pagination: {
              currentPage: parseInt(page),
              totalPages: 0,
              totalUsers: 0,
              hasNextPage: false,
              hasPrevPage: false,
              limit: parseInt(limit)
            }
          }
        });
      }
      
      query._id = { $in: downlineIds };
    }
    
    // Apply filters (only if they don't conflict with role-based restrictions)
    if (role && req.user.role === 'super_admin') {
      query.role = role;
    } else if (role && req.user.role === 'admin' && ['user', 'moderator', 'admin'].includes(role)) {
      // For admin, combine role filter with existing role restriction
      if (query.role && query.role.$in) {
        query.role = { $in: query.role.$in.filter(r => r === role) };
      } else {
        query.role = role;
      }
    }
    
    if (isActive !== undefined) query.isActive = isActive === 'true';
    
    // Search functionality
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    // Execute query
    const [users, totalUsers] = await Promise.all([
      User.find(query)
        .select('-password')
        .populate('createdBy', 'username email')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(query)
    ]);
    
    // Transform users to include 'id' field (convert _id to id)
    const transformedUsers = users.map(user => {
      const userObj = user.toObject ? user.toObject() : user;
      return {
        ...userObj,
        id: userObj._id ? String(userObj._id) : String(userObj.id || '')
      };
    });
    
    // Calculate pagination info
    const totalPages = Math.ceil(totalUsers / parseInt(limit));
    const hasNextPage = parseInt(page) < totalPages;
    const hasPrevPage = parseInt(page) > 1;
    
    res.status(200).json({
      success: true,
      message: 'Users retrieved successfully',
      data: {
        users: transformedUsers,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalUsers,
          hasNextPage,
          hasPrevPage,
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve users',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get user by ID
router.get('/:id', authenticateToken, validateObjectId('id'), canManageUser, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('createdBy', 'username email');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Transform user to include 'id' field
    const userObj = user.toObject ? user.toObject() : user;
    const transformedUser = {
      ...userObj,
      id: userObj._id ? String(userObj._id) : String(userObj.id || '')
    };
    
    res.status(200).json({
      success: true,
      message: 'User retrieved successfully',
      data: { user: transformedUser }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Update user
router.put('/:id', authenticateToken, validateObjectId('id'), validateUserUpdate, canManageUser, async (req, res) => {
  try {
    const { username, email, role, isActive } = req.body;
    const userId = req.params.id;
    
    // Check if username or email already exists (excluding current user)
    if (username || email) {
      const existingUser = await User.findOne({
        _id: { $ne: userId },
        $or: [
          ...(username ? [{ username }] : []),
          ...(email ? [{ email }] : [])
        ]
      });
      
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: existingUser.username === username ? 'Username already taken' : 'Email already registered'
        });
      }
    }
    
    // Prepare update data
    const updateData = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    // Only allow role changes by super_admin or if admin is managing lower roles
    if (role) {
      const targetUser = await User.findById(userId);
      
      if (req.user.role === 'super_admin') {
        updateData.role = role;
      } else if (req.user.role === 'admin' && !['admin', 'super_admin'].includes(role) && !['admin', 'super_admin'].includes(targetUser.role)) {
        updateData.role = role;
      } else {
        return res.status(403).json({
          success: false,
          message: 'You cannot assign this role'
        });
      }
    }
    
    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password').populate('createdBy', 'username email');
    
    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Transform user to include 'id' field
    const userObj = updatedUser.toObject ? updatedUser.toObject() : updatedUser;
    const transformedUser = {
      ...userObj,
      id: userObj._id ? userObj._id.toString() : userObj.id
    };
    
    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: { user: transformedUser }
    });
  } catch (error) {
    console.error('Update user error:', error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to update user',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Delete user
router.delete('/:id', authenticateToken, requireRole(['admin', 'super_admin']), validateObjectId('id'), canManageUser, async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Prevent self-deletion
    if (req.user._id.toString() === userId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check if user has balance
    if (user.balance > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete user with positive balance'
      });
    }
    
    // Delete user
    await User.findByIdAndDelete(userId);
    
    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get user statistics (admin only)
router.get('/stats/overview', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const stats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
          totalBalance: { $sum: '$balance' },
          activeUsers: {
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
          }
        }
      }
    ]);
    
    // Get total users count
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    
    // Get recent registrations (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentRegistrations = await User.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });
    
    res.status(200).json({
      success: true,
      message: 'User statistics retrieved successfully',
      data: {
        overview: {
          totalUsers,
          activeUsers,
          inactiveUsers: totalUsers - activeUsers,
          recentRegistrations
        },
        roleStats: stats
      }
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get current user profile
router.get('/profile/me', authenticateToken, async (req, res) => {
  try {
    // Ensure user is authenticated and has a valid ID
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const user = await User.findById(req.user._id)
      .select('-password')
      .populate('createdBy', 'username email');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Transform user to include 'id' field
    const userObj = user.toObject ? user.toObject() : user;
    const transformedUser = {
      ...userObj,
      id: userObj._id ? String(userObj._id) : String(userObj.id || '')
    };
    
    res.status(200).json({
      success: true,
      message: 'Profile retrieved successfully',
      data: { user: transformedUser }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve profile',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Update current user profile
router.put('/profile/me', authenticateToken, async (req, res) => {
  try {
    // Ensure user is authenticated and has a valid ID
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const { username, email } = req.body;
    const userId = req.user._id;
    
    // Check if username or email already exists (excluding current user)
    if (username || email) {
      const existingUser = await User.findOne({
        _id: { $ne: userId },
        $or: [
          ...(username ? [{ username }] : []),
          ...(email ? [{ email }] : [])
        ]
      });
      
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: existingUser.username === username ? 'Username already taken' : 'Email already registered'
        });
      }
    }
    
    // Prepare update data (users can only update username and email)
    const updateData = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    
    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password').populate('createdBy', 'username email');
    
    // Transform user to include 'id' field
    const userObj = updatedUser.toObject ? updatedUser.toObject() : updatedUser;
    const transformedUser = {
      ...userObj,
      id: userObj._id ? userObj._id.toString() : userObj.id
    };
    
    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: transformedUser }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get downline hierarchy for a user
router.get('/:id/downline', authenticateToken, validateObjectId('id'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user can view this downline
    // Users can view their own downline, admins can view any user's downline
    const canView = req.user._id.toString() === id || 
                   await isInDownline(req.user._id, id) ||
                   ['admin', 'super_admin'].includes(req.user.role);
    
    if (!canView && req.user._id.toString() !== id) {
      return res.status(403).json({
        success: false,
        message: 'You cannot view this user\'s downline'
      });
    }
    
    // Get downline as flat list
    const downline = await getDownline(id, false);
    
    // Transform users to include 'id' field
    const transformedDownline = downline.map((user) => {
      const userObj = user.toObject ? user.toObject() : user;
      return {
        ...userObj,
        id: userObj._id ? String(userObj._id) : String(userObj.id || '')
      };
    });
    
    res.status(200).json({
      success: true,
      message: 'Downline retrieved successfully',
      data: {
        downline: transformedDownline,
        count: transformedDownline.length
      }
    });
  } catch (error) {
    console.error('Get downline error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve downline',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get downline hierarchy as tree structure
router.get('/:id/downline/tree', authenticateToken, validateObjectId('id'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user can view this downline
    const canView = req.user._id.toString() === id || 
                   await isInDownline(req.user._id, id) ||
                   ['admin', 'super_admin'].includes(req.user.role);
    
    if (!canView && req.user._id.toString() !== id) {
      return res.status(403).json({
        success: false,
        message: 'You cannot view this user\'s downline'
      });
    }
    
    // Get downline as tree
    const tree = await getDownlineTree(id);
    
    if (!tree) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Downline tree retrieved successfully',
      data: { tree }
    });
  } catch (error) {
    console.error('Get downline tree error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve downline tree',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get next level users (direct children only)
router.get('/:id/next-level', authenticateToken, validateObjectId('id'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user can view next level
    const canView = req.user._id.toString() === id || 
                   await isInDownline(req.user._id, id) ||
                   ['admin', 'super_admin'].includes(req.user.role);
    
    if (!canView && req.user._id.toString() !== id) {
      return res.status(403).json({
        success: false,
        message: 'You cannot view this user\'s next level'
      });
    }
    
    const nextLevelUsers = await getNextLevelUsers(id);
    
    // Transform users to include 'id' field
    const transformedUsers = nextLevelUsers.map((user) => {
      const userObj = user.toObject ? user.toObject() : user;
      return {
        ...userObj,
        id: userObj._id ? userObj._id.toString() : userObj.id
      };
    });
    
    res.status(200).json({
      success: true,
      message: 'Next level users retrieved successfully',
      data: {
        users: transformedUsers,
        count: transformedUsers.length
      }
    });
  } catch (error) {
    console.error('Get next level users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve next level users',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;