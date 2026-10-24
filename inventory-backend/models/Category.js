const mongoose = require('mongoose');
const { z } = require('zod');

const createCategorySchema = z.object({
  name: z
    .string({ required_error: 'Category name is required' })
    .trim()
    .min(2, 'Category name must be at least 2 characters long')
    .max(50, 'Category name cannot exceed 50 characters'),
  description: z.string().trim().max(250).optional().or(z.literal('')),
});

const updateCategorySchema = createCategorySchema.partial();

const categorySchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 250,
      default: '',
    },
  },
  { timestamps: true }
);

// Unique category name per Admin workspace
categorySchema.index({ organizationId: 1, name: 1 }, { unique: true });

const Category = mongoose.model('Category', categorySchema);

module.exports = { Category, createCategorySchema, updateCategorySchema };