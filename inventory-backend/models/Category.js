const mongoose = require('mongoose');
const { z } = require('zod');


// Schema for Creating a Category
const createCategorySchema = z.object({
  name: z
    .string({ required_error: 'Category name is required' })
    .trim()
    .min(2, 'Category name must be at least 2 characters long')
    .max(50, 'Category name cannot exceed 50 characters'),
  description: z
    .string()
    .trim()
    .max(250, 'Description cannot exceed 250 characters')
    .optional(),
});

// Schema for Updating a Category
const updateCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Category name must be at least 2 characters long')
    .max(50, 'Category name cannot exceed 50 characters')
    .optional(),
  description: z
    .string()
    .trim()
    .max(250, 'Description cannot exceed 250 characters')
    .optional(),
});


const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
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
  {
    timestamps: true,
  }
);

const Category = mongoose.model('Category', categorySchema);

module.exports = {
  Category,
  createCategorySchema,
  updateCategorySchema,
};