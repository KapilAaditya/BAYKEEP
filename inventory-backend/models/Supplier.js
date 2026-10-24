const mongoose = require('mongoose');
const { z } = require('zod');

const createSupplierSchema = z.object({
  name: z.string().trim().min(2).max(100),
  contactPerson: z.string().trim().max(100).optional().or(z.literal('')),
  phone: z.string().trim().min(5).max(20),
  email: z.string().trim().email().optional().or(z.literal('')),
  address: z.string().trim().max(250).optional().or(z.literal('')),
  notes: z.string().trim().max(500).optional().or(z.literal('')),
});

const updateSupplierSchema = createSupplierSchema.partial();

const supplierSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    contactPerson: { type: String, trim: true, default: '' },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, default: '' },
    address: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' },
    totalBilled: { type: Number, default: 0, min: 0 },
    totalPaid: { type: Number, default: 0, min: 0 },
    balanceDue: { type: Number, default: 0, min: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const Supplier = mongoose.model('Supplier', supplierSchema);

module.exports = { Supplier, createSupplierSchema, updateSupplierSchema };