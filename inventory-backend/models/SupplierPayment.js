const mongoose = require('mongoose');
const { z } = require('zod');

const objectIdSchema = z
  .string()
  .refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: 'Invalid ID format',
  });

const createSupplierPaymentSchema = z.object({
  supplier: objectIdSchema,
  purchase: objectIdSchema.optional(),
  amountPaid: z.coerce.number().positive(),
  paymentMethod: z.enum(['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'OTHER']).default('CASH'),
  transactionReference: z.string().trim().max(100).optional().or(z.literal('')),
  paymentDate: z.string().optional(),
  notes: z.string().trim().max(500).optional().or(z.literal('')),
});

const supplierPaymentSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
    purchase: { type: mongoose.Schema.Types.ObjectId, ref: 'Purchase' },
    amountPaid: { type: Number, required: true, min: 0.01 },
    paymentDate: { type: Date, default: Date.now },
    paymentMethod: {
      type: String,
      enum: ['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'OTHER'],
      default: 'CASH',
    },
    transactionReference: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

supplierPaymentSchema.index({ organizationId: 1, supplier: 1, paymentDate: -1 });

const SupplierPayment = mongoose.model('SupplierPayment', supplierPaymentSchema);

module.exports = { SupplierPayment, createSupplierPaymentSchema };