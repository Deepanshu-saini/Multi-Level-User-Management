const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['credit', 'debit'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: [0.01, 'Amount must be greater than 0']
  },
  previousBalance: {
    type: Number,
    required: true
  },
  newBalance: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'completed'
  },
  reference: {
    type: String,
    unique: true,
    sparse: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Generate unique reference number
transactionSchema.pre('save', function(next) {
  if (!this.reference) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    this.reference = `TXN-${timestamp}-${random}`.toUpperCase();
  }
  next();
});

// Index for better query performance
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ performedBy: 1 });
transactionSchema.index({ reference: 1 });
transactionSchema.index({ type: 1 });
transactionSchema.index({ status: 1 });

// Static method to get user transaction summary
transactionSchema.statics.getUserSummary = async function(userId, startDate, endDate) {
  const matchStage = {
    userId: new mongoose.Types.ObjectId(userId),
    status: 'completed'
  };
  
  if (startDate && endDate) {
    matchStage.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }
  
  return await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$type',
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    }
  ]);
};

// Static method to get transaction statistics
transactionSchema.statics.getStatistics = async function(startDate, endDate) {
  const matchStage = { status: 'completed' };
  
  if (startDate && endDate) {
    matchStage.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }
  
  return await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalTransactions: { $sum: 1 },
        totalCredits: {
          $sum: {
            $cond: [{ $eq: ['$type', 'credit'] }, '$amount', 0]
          }
        },
        totalDebits: {
          $sum: {
            $cond: [{ $eq: ['$type', 'debit'] }, '$amount', 0]
          }
        },
        creditCount: {
          $sum: {
            $cond: [{ $eq: ['$type', 'credit'] }, 1, 0]
          }
        },
        debitCount: {
          $sum: {
            $cond: [{ $eq: ['$type', 'debit'] }, 1, 0]
          }
        }
      }
    }
  ]);
};

module.exports = mongoose.model('Transaction', transactionSchema);