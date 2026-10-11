const mongoose = require('mongoose');
const { z } = require('zod');


// Schema for Logging a Stock Movement (In / Out / Adjustment)
const createStockTransactionSchema = z.object({
  type: z.enum(['IN', 'OUT', 'ADJUSTMENT'], {
    errorMap: () => ({
      message: 'Transaction type must be IN, OUT, or ADJUSTMENT',
    }),
  }),
  quantity: z
    .number({ required_error: 'Quantity is required' })
    .int('Quantity must be an integer')
    .positive('Quantity must be greater than zero'),
  reason: z
    .string()
    .trim()
    .max(250, 'Reason cannot exceed 250 characters')
    .optional(),
});


const transactionSchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Item',
      required: true,
    },
    type: {
      type: String,
      enum: ['IN', 'OUT', 'ADJUSTMENT'],
      required: true,
    },
    // The amount added or subtracted
    quantityChanged: {
      type: Number,
      required: true,
    },
    // Stock count before this operation
    previousQuantity: {
      type: Number,
      required: true,
      min: 0,
    },
    // Stock count after this operation
    newQuantity: {
      type: Number,
      required: true,
      min: 0,
    },
    reason: {
      type: String,
      trim: true,
      default: 'Manual adjustment',
    },
    // The user who performed this stock update
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true, // Automatically captures when the transaction occurred
  }
);

// Index to quickly query history for a specific item or recent transactions
transactionSchema.index({ item: 1, createdAt: -1 });

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = {
  Transaction,
  createStockTransactionSchema,
};