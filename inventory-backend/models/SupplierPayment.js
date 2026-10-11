const mongoose = require('mongoose');
const { z } = require('zod');

//   1. Zod Validation Schemas

const objectIdSchema = z
  .string()
  .refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: 'Invalid ID format',
  });

// Schema for Recording an Installment / Payment to a Dealer
const createSupplierPaymentSchema = z.object({
  supplier: objectIdSchema,
  purchase: objectIdSchema.optional(), // Optional: link payment to a specific invoice
  amountPaid: z
    .number({ required_error: 'Payment amount is required' })
    .positive('Payment amount must be greater than zero'),
  paymentMethod: z
    .enum(['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'OTHER'], {
      errorMap: () => ({
        message: 'Method must be CASH, UPI, BANK_TRANSFER, CHEQUE, or OTHER',
      }),
    })
    .default('CASH'),
  transactionReference: z
    .string()
    .trim()
    .max(100, 'Reference cannot exceed 100 characters')
    .optional(), // e.g. UPI Ref ID, UTR Number, or Cheque number
  paymentDate: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .optional(),
  notes: z.string().trim().max(500).optional(),
});

//   2. Mongoose Schema & Model

const supplierPaymentSchema = new mongoose.Schema(
  {
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
    },
    // Optional: link to a specific purchase bill, or leave null for general account settlement
    purchase: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Purchase',
    },
    amountPaid: {
      type: Number,
      required: true,
      min: [0.01, 'Payment amount must be greater than zero'],
    },
    paymentDate: {
      type: Date,
      default: Date.now,
    },
    paymentMethod: {
      type: String,
      enum: ['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'OTHER'],
      default: 'CASH',
    },
    transactionReference: {
      type: String,
      trim: true,
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index to quickly load full payment history for any dealer
supplierPaymentSchema.index({ supplier: 1, paymentDate: -1 });

const SupplierPayment = mongoose.model('SupplierPayment', supplierPaymentSchema);

module.exports = {
  SupplierPayment,
  createSupplierPaymentSchema,
};