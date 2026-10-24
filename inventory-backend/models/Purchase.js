const mongoose = require('mongoose');
const { z } = require('zod');

const objectIdSchema = z
  .string()
  .refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: 'Invalid ID format',
  });

const purchaseItemSchema = z.object({
  item: objectIdSchema,
  quantity: z.coerce.number().int().positive(),
  unitCost: z.coerce.number().min(0),
});

const createPurchaseSchema = z.object({
  billNumber: z.string().trim().min(1),
  supplier: objectIdSchema,
  items: z.array(purchaseItemSchema).nonempty(),
  paidAmount: z.coerce.number().min(0).default(0),
  paymentMethod: z.enum(['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'CREDIT']).default('CREDIT'),
  purchaseDate: z.string().optional(),
  notes: z.string().trim().max(500).optional().or(z.literal('')),
});

const purchaseSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    billNumber: { type: String, required: true, trim: true },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
    items: [
      {
        item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
        quantity: { type: Number, required: true, min: 1 },
        unitCost: { type: Number, required: true, min: 0 },
        totalCost: { type: Number, required: true, min: 0 },
      },
    ],
    totalAmount: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    balanceAmount: { type: Number, required: true, min: 0 },
    paymentStatus: {
      type: String,
      enum: ['UNPAID', 'PARTIALLY_PAID', 'PAID'],
      default: 'UNPAID',
    },
    purchaseDate: { type: Date, default: Date.now },
    notes: { type: String, trim: true, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

purchaseSchema.index({ organizationId: 1, supplier: 1, purchaseDate: -1 });

const Purchase = mongoose.model('Purchase', purchaseSchema);

module.exports = { Purchase, createPurchaseSchema };