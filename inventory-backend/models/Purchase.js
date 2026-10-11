const mongoose = require('mongoose');
const { z } = require('zod');

 //  1. Zod Validation Schemas

const objectIdSchema = z
  .string()
  .refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: 'Invalid ID format',
  });

// Schema for individual item row in a purchase bill
const purchaseItemSchema = z.object({
  item: objectIdSchema,
  quantity: z
    .number({ required_error: 'Quantity is required' })
    .int('Quantity must be an integer')
    .positive('Quantity must be greater than zero'),
  unitCost: z
    .number({ required_error: 'Unit cost is required' })
    .min(0, 'Unit cost cannot be negative'),
});

// Schema for Creating a Purchase Bill
const createPurchaseSchema = z.object({
  billNumber: z
    .string({ required_error: 'Bill/Invoice number is required' })
    .trim()
    .min(1, 'Bill number cannot be empty'),
  supplier: objectIdSchema,
  items: z
    .array(purchaseItemSchema)
    .nonempty('Purchase must contain at least one item'),
  paidAmount: z
    .number()
    .min(0, 'Paid amount cannot be negative')
    .default(0), // Initial amount paid upfront (can be 0 if completely on credit)
  paymentMethod: z
    .enum(['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'CREDIT'])
    .default('CREDIT'),
  purchaseDate: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .optional(),
  notes: z.string().trim().max(500).optional(),
});

//   2. Mongoose Schema & Model

const purchaseSchema = new mongoose.Schema(
  {
    billNumber: {
      type: String,
      required: true,
      trim: true,
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
    },
    // The items and quantities purchased in this order
    items: [
      {
        item: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Item',
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        unitCost: {
          type: Number,
          required: true,
          min: 0,
        },
        totalCost: {
          type: Number,
          required: true,
          min: 0,
        },
      },
    ],
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    balanceAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentStatus: {
      type: String,
      enum: ['UNPAID', 'PARTIALLY_PAID', 'PAID'],
      default: 'UNPAID',
    },
    purchaseDate: {
      type: Date,
      default: Date.now,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast lookup by dealer or date
purchaseSchema.index({ supplier: 1, purchaseDate: -1 });

const Purchase = mongoose.model('Purchase', purchaseSchema);

module.exports = {
  Purchase,
  createPurchaseSchema,
};