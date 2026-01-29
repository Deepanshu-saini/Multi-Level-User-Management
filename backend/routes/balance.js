const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { authenticateToken, requireRole, canManageUser } = require('../middleware/auth');
const { validateBalanceOperation, validateTransactionQuery, validateObjectId } = require('../middleware/validation');

const router = express.Router();

// Add balance to user
router.post('/add', authenticateToken, requireRole(['admin', 'super_admin']), validateBalanceOperation, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { userId, amount, description } = req.body;
    
    // Get user
    const user = await User.findById(userId).session(session);
    
    if (!user) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check if current user can manage target user
    if (!req.user.canManage(user) && req.user._id.toString() !== userId) {
      await session.abortTransaction();
      return res.status(403).json({
        success: false,
        message: 'You cannot manage this user\'s balance'
      });
    }
    
    const previousBalance = user.balance;
    const newBalance = previousBalance + parseFloat(amount);
    
    // Update user balance
    await User.findByIdAndUpdate(
      userId,
      { balance: newBalance },
      { session, new: true }
    );
    
    // Create transaction record
    const transaction = new Transaction({
      userId,
      type: 'credit',
      amount: parseFloat(amount),
      previousBalance,
      newBalance,
      description,
      performedBy: req.user._id
    });
    
    await transaction.save({ session });
    
    await session.commitTransaction();
    
    // Populate transaction for response
    await transaction.populate([
      { path: 'userId', select: 'username email' },
      { path: 'performedBy', select: 'username email' }
    ]);
    
    res.status(200).json({
      success: true,
      message: 'Balance added successfully',
      data: {
        transaction,
        newBalance
      }
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Add balance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add balance',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  } finally {
    session.endSession();
  }
});

// Deduct balance from user
router.post('/deduct', authenticateToken, requireRole(['admin', 'super_admin']), validateBalanceOperation, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { userId, amount, description } = req.body;
    
    // Get user
    const user = await User.findById(userId).session(session);
    
    if (!user) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check if current user can manage target user
    if (!req.user.canManage(user) && req.user._id.toString() !== userId) {
      await session.abortTransaction();
      return res.status(403).json({
        success: false,
        message: 'You cannot manage this user\'s balance'
      });
    }
    
    const previousBalance = user.balance;
    const deductAmount = parseFloat(amount);
    
    // Check if user has sufficient balance
    if (previousBalance < deductAmount) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance'
      });
    }
    
    const newBalance = previousBalance - deductAmount;
    
    // Update user balance
    await User.findByIdAndUpdate(
      userId,
      { balance: newBalance },
      { session, new: true }
    );
    
    // Create transaction record
    const transaction = new Transaction({
      userId,
      type: 'debit',
      amount: deductAmount,
      previousBalance,
      newBalance,
      description,
      performedBy: req.user._id
    });
    
    await transaction.save({ session });
    
    await session.commitTransaction();
    
    // Populate transaction for response
    await transaction.populate([
      { path: 'userId', select: 'username email' },
      { path: 'performedBy', select: 'username email' }
    ]);
    
    res.status(200).json({
      success: true,
      message: 'Balance deducted successfully',
      data: {
        transaction,
        newBalance
      }
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Deduct balance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deduct balance',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  } finally {
    session.endSession();
  }
});

// Get transaction history for a user
router.get('/history/:userId', authenticateToken, validateObjectId('userId'), validateTransactionQuery, async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      page = 1,
      limit = 10,
      type,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    // Check if user can access this transaction history
    const targetUser = await User.findById(userId);
    
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Users can only see their own history, admins can see users they manage
    if (req.user._id.toString() !== userId && !req.user.canManage(targetUser)) {
      return res.status(403).json({
        success: false,
        message: 'You cannot access this transaction history'
      });
    }
    
    // Build query
    const query = { userId };
    
    if (type) query.type = type;
    
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    // Execute query
    const [transactions, totalTransactions] = await Promise.all([
      Transaction.find(query)
        .populate('userId', 'username email')
        .populate('performedBy', 'username email')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Transaction.countDocuments(query)
    ]);
    
    // Calculate pagination info
    const totalPages = Math.ceil(totalTransactions / parseInt(limit));
    const hasNextPage = parseInt(page) < totalPages;
    const hasPrevPage = parseInt(page) > 1;
    
    res.status(200).json({
      success: true,
      message: 'Transaction history retrieved successfully',
      data: {
        transactions,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalTransactions,
          hasNextPage,
          hasPrevPage,
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get transaction history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve transaction history',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get current user's transaction history
router.get('/history/me', authenticateToken, validateTransactionQuery, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      type,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    // Build query
    const query = { userId: req.user._id };
    
    if (type) query.type = type;
    
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    // Execute query
    const [transactions, totalTransactions] = await Promise.all([
      Transaction.find(query)
        .populate('userId', 'username email')
        .populate('performedBy', 'username email')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Transaction.countDocuments(query)
    ]);
    
    // Calculate pagination info
    const totalPages = Math.ceil(totalTransactions / parseInt(limit));
    const hasNextPage = parseInt(page) < totalPages;
    const hasPrevPage = parseInt(page) > 1;
    
    res.status(200).json({
      success: true,
      message: 'Transaction history retrieved successfully',
      data: {
        transactions,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalTransactions,
          hasNextPage,
          hasPrevPage,
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get my transaction history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve transaction history',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get transaction summary for a user
router.get('/summary/:userId', authenticateToken, validateObjectId('userId'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;
    
    // Check if user can access this summary
    const targetUser = await User.findById(userId);
    
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Users can only see their own summary, admins can see users they manage
    if (req.user._id.toString() !== userId && !req.user.canManage(targetUser)) {
      return res.status(403).json({
        success: false,
        message: 'You cannot access this transaction summary'
      });
    }
    
    // Get transaction summary
    const summary = await Transaction.getUserSummary(userId, startDate, endDate);
    
    // Format summary
    const formattedSummary = {
      totalCredits: 0,
      totalDebits: 0,
      creditCount: 0,
      debitCount: 0,
      netAmount: 0
    };
    
    summary.forEach(item => {
      if (item._id === 'credit') {
        formattedSummary.totalCredits = item.totalAmount;
        formattedSummary.creditCount = item.count;
      } else if (item._id === 'debit') {
        formattedSummary.totalDebits = item.totalAmount;
        formattedSummary.debitCount = item.count;
      }
    });
    
    formattedSummary.netAmount = formattedSummary.totalCredits - formattedSummary.totalDebits;
    
    res.status(200).json({
      success: true,
      message: 'Transaction summary retrieved successfully',
      data: {
        summary: formattedSummary,
        currentBalance: targetUser.balance
      }
    });
  } catch (error) {
    console.error('Get transaction summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve transaction summary',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get overall transaction statistics (admin only)
router.get('/stats/overview', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Get transaction statistics
    const stats = await Transaction.getStatistics(startDate, endDate);
    
    // Get total balance across all users
    const totalBalanceResult = await User.aggregate([
      { $group: { _id: null, totalBalance: { $sum: '$balance' } } }
    ]);
    
    const totalBalance = totalBalanceResult.length > 0 ? totalBalanceResult[0].totalBalance : 0;
    
    res.status(200).json({
      success: true,
      message: 'Transaction statistics retrieved successfully',
      data: {
        statistics: stats.length > 0 ? stats[0] : {
          totalTransactions: 0,
          totalCredits: 0,
          totalDebits: 0,
          creditCount: 0,
          debitCount: 0
        },
        totalBalance
      }
    });
  } catch (error) {
    console.error('Get transaction stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve transaction statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get transaction by reference
router.get('/transaction/:reference', authenticateToken, async (req, res) => {
  try {
    const { reference } = req.params;
    
    const transaction = await Transaction.findOne({ reference })
      .populate('userId', 'username email')
      .populate('performedBy', 'username email');
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }
    
    // Check if user can access this transaction
    const canAccess = req.user._id.toString() === transaction.userId._id.toString() ||
                     req.user._id.toString() === transaction.performedBy._id.toString() ||
                     req.user.canManage(transaction.userId);
    
    if (!canAccess) {
      return res.status(403).json({
        success: false,
        message: 'You cannot access this transaction'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Transaction retrieved successfully',
      data: { transaction }
    });
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve transaction',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;