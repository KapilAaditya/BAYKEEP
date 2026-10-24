const mongoose = require('mongoose');
const { z } = require('zod');

const objectIdSchema = z
  .string()
  .refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: 'Invalid Category ID',
  });

const createItemSchema = z.object({
  sku: z.string().trim().min(1).max(30).toUpperCase(),
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional().or(z.literal('')),
  category: objectIdSchema,
  quantity: z.coerce.number().int().min(0).default(0),
  unit: z.string().trim().default('pcs'),
  unitPrice: z.coerce.number().min(0).default(0),
  lowStockThreshold: z.coerce.number().int().min(0).default(5),
  location: z.string().trim().max(100).optional().or(z.literal('')),
});

const updateItemSchema = createItemSchema.partial();

const itemSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sku: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      maxlength: 30,
    },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 500, default: '' },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    quantity: { type: Number, required: true, min: 0, default: 0 },
    unit: { type: String, trim: true, default: 'pcs' },
    unitPrice: { type: Number, min: 0, default: 0 },
    lowStockThreshold: { type: Number, min: 0, default: 5 },
    location: { type: String, trim: true, default: 'General Storage' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Unique SKU per Admin workspace
itemSchema.index({ organizationId: 1, sku: 1 }, { unique: true });

itemSchema.virtual('isLowStock').get(function () {
  return this.quantity <= this.lowStockThreshold;
});

const Item = mongoose.model('Item', itemSchema);

module.exports = { Item, createItemSchema, updateItemSchema };