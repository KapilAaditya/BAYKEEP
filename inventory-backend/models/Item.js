const mongoose = require('mongoose');
const { z } = require('zod');


// Custom MongoDB ObjectId validator for Zod
const objectIdSchema = z
  .string()
  .refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: 'Invalid Category ID',
  });

// Schema for Creating a New Item
// Replace createItemSchema in models/Item.js:
const createItemSchema = z.object({
  sku: z
    .string({ required_error: 'SKU is required' })
    .trim()
    .min(1, 'SKU cannot be empty')
    .max(30, 'SKU cannot exceed 30 characters')
    .toUpperCase(),
  name: z
    .string({ required_error: 'Item name is required' })
    .trim()
    .min(1, 'Name cannot be empty')
    .max(100, 'Name cannot exceed 100 characters'),
  description: z.string().trim().max(500).optional().or(z.literal('')),
  category: objectIdSchema,
  quantity: z.coerce.number().int().min(0).default(0),
  unit: z.string().trim().default('pcs'),
  unitPrice: z.coerce.number().min(0).default(0),
  lowStockThreshold: z.coerce.number().int().min(0).default(5),
  location: z.string().trim().max(100).optional().or(z.literal('')),
});

// Schema for Updating an Existing Item
const updateItemSchema = createItemSchema.partial();


const itemSchema = new mongoose.Schema(
  {
    sku: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: 30,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    unit: {
      type: String,
      trim: true,
      default: 'pcs',
    },
    unitPrice: {
      type: Number,
      min: 0,
      default: 0,
    },
    // The user-configured alert limit
    lowStockThreshold: {
      type: Number,
      min: 0,
      default: 5,
    },
    location: {
      type: String,
      trim: true,
      default: 'General Storage',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true }, // Include virtual properties in API responses
    toObject: { virtuals: true },
  }
);

// Virtual field: Calculates whether stock has reached or fallen below the custom limit
itemSchema.virtual('isLowStock').get(function () {
  return this.quantity <= this.lowStockThreshold;
});

const Item = mongoose.model('Item', itemSchema);

module.exports = {
  Item,
  createItemSchema,
  updateItemSchema,
};