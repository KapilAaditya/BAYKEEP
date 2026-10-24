const mongoose = require('mongoose');
const { z } = require('zod');

const createStockTransactionSchema = z.object({
  type: z.enum(['IN', 'OUT', 'ADJUSTMENT']),
  quantity: z.coerce.number().int().positive('Quantity must be greater than zero'),
  sellingPrice: z.coerce.number().min(0, 'Selling price cannot be negative').optional(),
  reason: z.string().trim().max(250).optional().or(z.literal('')),
});

const transactionSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
    type: { type: String, enum: ['IN', 'OUT', 'ADJUSTMENT'], required: true },
    quantityChanged: { type: Number, required: true },
    previousQuantity: { type: Number, required: true, min: 0 },
    newQuantity: { type: Number, required: true, min: 0 },
    // Purchase cost per unit at the time of transaction
    unitCost: { type: Number, default: 0, min: 0 },
    // Manual selling price per unit (set when selling/dispatching)
    sellingPrice: { type: Number, default: 0, min: 0 },
    // Total revenue from this sale (quantity * sellingPrice)
    totalSaleAmount: { type: Number, default: 0, min: 0 },
    // Total purchase value deducted from Stock Valuation (quantity * unitCost)
    costDeducted: { type: Number, default: 0, min: 0 },
    reason: { type: String, trim: true, default: 'Manual adjustment' },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

transactionSchema.index({ organizationId: 1, item: 1, createdAt: -1 });

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = { Transaction, createStockTransactionSchema };