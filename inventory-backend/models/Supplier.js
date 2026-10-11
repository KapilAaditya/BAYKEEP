const mongoose = require('mongoose');
const { z } = require('zod');

//   1. Zod Validation Schemas

// Schema for Creating a Supplier / Dealer
const createSupplierSchema = z.object({
  name: z
    .string({ required_error: 'Dealer name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters'),
  contactPerson: z.string().trim().max(100).optional(),
  phone: z
    .string({ required_error: 'Phone number is required' })
    .trim()
    .min(5, 'Phone number must be at least 5 digits')
    .max(20, 'Phone number cannot exceed 20 characters'),
  email: z.string().trim().email('Invalid email address').optional().or(z.literal('')),
  address: z.string().trim().max(250).optional(),
  notes: z.string().trim().max(500).optional(),
});

// Schema for Updating a Supplier
const updateSupplierSchema = createSupplierSchema.partial();

   //2. Mongoose Schema & Model

const supplierSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    contactPerson: {
      type: String,
      trim: true,
      default: '',
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    // Financial Ledger Fields (Auto-updated via purchases and payments)
    totalBilled: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalPaid: {
      type: Number,
      default: 0,
      min: 0,
    },
    balanceDue: {
      type: Number,
      default: 0,
      min: 0, // Total money you currently owe this dealer
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

const Supplier = mongoose.model('Supplier', supplierSchema);

module.exports = {
  Supplier,
  createSupplierSchema,
  updateSupplierSchema,
};