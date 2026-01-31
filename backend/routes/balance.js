const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { authenticateToken, requireRole, canManageUser } = require('../middleware/auth');
const { validateBalanceOperation, validateTransactionQuery, validateObjectId } = require('../middleware/validation');
const { isInDownline, getParent } = require('../utils/downline');

// Helper function to safely get user ID as ObjectId
const getUserObjectId = (user) => {
  if (!user || !user._id) {
    throw new Error('User not authenticated or user ID is missing');
  }
  // req.user._id should already be an ObjectId from mongoose, but ensure it's valid
  if (user._id instanceof mongoose.Types.ObjectId) {
    return user._id;
  }
  // If it's a string, convert to ObjectId
  if (typeof user._id === 'string' && mongoose.Types.ObjectId.isValid(user._id)) {
    return new mongoose.Types.ObjectId(user._id);
  }
  throw new Error('Invalid user ID format');
};

const router = express.Router();

// Add balance to user (with automatic deduction from sender or parent)
router.post('/add', authenticateToken, requireRole(['admin', 'super_admin']), validateBalanceOperation, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { userId, amount, description } = req.body;
    const senderId = req.user._id;
    const transferAmount = parseFloat(amount);
    
    // Get target user
    const targetUser = await User.findById(userId).session(session);
    
    if (!targetUser) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check if target user is in sender's downline (for regular users)
    // OR if admin is crediting, check if target is in hierarchy
    const isTargetInDownline = await isInDownline(senderId, userId);
    const isSelfRecharge = senderId.toString() === userId.toString();
    
    // Allow if: self-recharge OR target is in downline OR admin crediting any user
    if (!isSelfRecharge && !isTargetInDownline && !['admin', 'super_admin'].includes(req.user.role)) {
      await session.abortTransaction();
      return res.status(403).json({
        success: false,
        message: 'You can only credit balance to users in your downline'
      });
    }
    
    // Determine who should pay (sender or parent)
    // ALWAYS deduct from the target user's immediate parent when crediting to any user in hierarchy
    let payerId = senderId;
    let payer = await User.findById(senderId).session(session);
    
    // When crediting to any user in the hierarchy, deduct from that user's immediate parent
    if (!isSelfRecharge) {
      const parent = await getParent(userId);
      if (parent) {
        payerId = parent._id;
        payer = await User.findById(parent._id).session(session);
      }
      // If no parent (root user), deduct from sender (admin/self-recharge scenario)
      // This handles the case where owner/admin recharges root users or themselves
    }
    
    // Check if payer has sufficient balance (only if not self-recharge and has parent)
    if (!isSelfRecharge && payer && payer.balance < transferAmount) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: payerId.toString() === senderId.toString() 
          ? 'Insufficient balance' 
          : 'Parent user has insufficient balance'
      });
    }
    
    // Deduct from payer (if not self-recharge or if admin crediting with parent)
    if (!isSelfRecharge && payer && payerId.toString() !== userId.toString()) {
      const payerPreviousBalance = payer.balance;
      const payerNewBalance = payerPreviousBalance - transferAmount;
      
      await User.findByIdAndUpdate(
        payerId,
        { balance: payerNewBalance },
        { session, new: true }
      );
      
      // Create debit transaction for payer
      const payerTransaction = new Transaction({
        userId: payerId,
        type: 'debit',
        amount: transferAmount,
        previousBalance: payerPreviousBalance,
        newBalance: payerNewBalance,
        description: description || `Transfer to ${targetUser.username}`,
        performedBy: senderId
      });
      
      await payerTransaction.save({ session });
    }
    
    // Credit to target user
    const targetPreviousBalance = targetUser.balance;
    const targetNewBalance = targetPreviousBalance + transferAmount;
    
    await User.findByIdAndUpdate(
      userId,
      { balance: targetNewBalance },
      { session, new: true }
    );
    
    // Create credit transaction for target user
    const creditTransaction = new Transaction({
      userId,
      type: 'credit',
      amount: transferAmount,
      previousBalance: targetPreviousBalance,
      newBalance: targetNewBalance,
      description: description || (payerId.toString() === senderId.toString() 
        ? `Transfer from ${payer.username}` 
        : `Credit from admin`),
      performedBy: senderId
    });
    
    await creditTransaction.save({ session });
    
    await session.commitTransaction();
    
    // Populate transaction for response
    await creditTransaction.populate([
      { path: 'userId', select: 'username email' },
      { path: 'performedBy', select: 'username email' }
    ]);
    
    res.status(200).json({
      success: true,
      message: 'Balance added successfully',
      data: {
        transaction: creditTransaction,
        newBalance: targetNewBalance,
        deductedFrom: payerId.toString() !== userId.toString() ? {
          userId: payerId,
          username: payer.username,
          previousBalance: payer.balance + transferAmount,
          newBalance: payer.balance
        } : null
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

// Get current user's transaction history (MUST come before /history/:userId)
router.get('/history/me', authenticateToken, validateTransactionQuery, async (req, res) => {
  try {
    // Ensure user is authenticated and has a valid ID
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const {
      page = 1,
      limit = 10,
      type,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    // Build query - req.user._id should already be a valid ObjectId from mongoose
    // But we'll ensure it's properly formatted
    const userId = req.user._id instanceof mongoose.Types.ObjectId 
      ? req.user._id 
      : new mongoose.Types.ObjectId(req.user._id.toString());
    const query = { userId: userId };
    
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

// Get transaction history for a user
router.get('/history/:userId', authenticateToken, validateObjectId('userId'), validateTransactionQuery, async (req, res) => {
  try {
    const { userId } = req.params;
    const userIdObj = userId instanceof mongoose.Types.ObjectId 
      ? userId
      : new mongoose.Types.ObjectId(userId.toString());
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
    const targetUser = await User.findById(userIdObj);
    
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Users can see their own history, or users in their downline, or admins can see users they manage
    const isOwnHistory = req.user._id.toString() === userIdObj.toString();
    const isInUserDownline = await isInDownline(req.user._id, userIdObj);
    const canManage = req.user.canManage(targetUser);
    
    if (!isOwnHistory && !isInUserDownline && !canManage) {
      return res.status(403).json({
        success: false,
        message: 'You cannot access this transaction history'
      });
    }
    
    // Build query
    const query = { userId: userIdObj };
    
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