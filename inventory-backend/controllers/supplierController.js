const { Supplier } = require('../models/Supplier');
const { Purchase } = require('../models/Purchase');

// Get all suppliers with optional search and sort
const getSuppliers = async (req, res, next) => {
  try {
    const { search, sortBy = 'balanceDue' } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search,$options: 'i' } },
        { phone: { $regex: search,$options: 'i' } },
        { contactPerson: { $regex: search,$options: 'i' } },
      ];
    }

    const sortOrder = sortBy === 'balanceDue' ? { balanceDue: -1 } : { name: 1 };
    const suppliers = await Supplier.find(filter).sort(sortOrder);

    res.status(200).json({
      success: true,
      count: suppliers.length,
      data: suppliers,
    });
  } catch (err) {
    next(err);
  }
};

// Summary metrics: total outstanding debt across all suppliers
const getSupplierDebtSummary = async (req, res, next) => {
  try {
    const totals = await Supplier.aggregate([
      {
        $group: {
          _id: null,
          totalSuppliers: { $sum: 1 },
          totalBilled: { $sum: '$totalBilled' },
          totalPaid: { $sum: '$totalPaid' },
          totalOwed: { $sum: '$balanceDue' },
        },
      },
    ]);

    const result = totals[0] || {
      totalSuppliers: 0,
      totalBilled: 0,
      totalPaid: 0,
      totalOwed: 0,
    };

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

// Single supplier details
const getSupplierById = async (req, res, next) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }
    res.status(200).json({ success: true, data: supplier });
  } catch (err) {
    next(err);
  }
};

// Create a new supplier
const createSupplier = async (req, res, next) => {
  try {
    const { name, contactPerson, phone, email, address, notes } = req.body;
    const supplier = await Supplier.create({
      name,
      contactPerson,
      phone,
      email,
      address,
      notes,
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: 'Supplier created successfully',
      data: supplier,
    });
  } catch (err) {
    next(err);
  }
};

// Update an existing supplier
const updateSupplier = async (req, res, next) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    const updatableKeys = ['name', 'contactPerson', 'phone', 'email', 'address', 'notes'];
    updatableKeys.forEach((key) => {
      if (req.body[key] !== undefined) supplier[key] = req.body[key];
    });

    await supplier.save();
    res.status(200).json({ success: true, message: 'Supplier updated', data: supplier });
  } catch (err) {
    next(err);
  }
};

// Delete a supplier (if no existing purchases are linked)
const deleteSupplier = async (req, res, next) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    const linkedPurchases = await Purchase.countDocuments({ supplier: supplier._id });
    if (linkedPurchases > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete supplier. ${linkedPurchases} purchase bill(s) are linked to this supplier.`,
      });
    }

    await supplier.deleteOne();
    res.status(200).json({ success: true, message: 'Supplier deleted successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getSuppliers,
  getSupplierDebtSummary,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
};