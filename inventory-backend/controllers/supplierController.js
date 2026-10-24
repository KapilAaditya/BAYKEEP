const { Supplier } = require('../models/Supplier');
const { Purchase } = require('../models/Purchase');

const getSuppliers = async (req, res, next) => {
  try {
    const { search, sortBy = 'balanceDue' } = req.query;
    const filter = { organizationId: req.user.organizationId };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { contactPerson: { $regex: search, $options: 'i' } },
      ];
    }

    const sortOrder = sortBy === 'balanceDue' ? { balanceDue: -1 } : { name: 1 };
    const suppliers = await Supplier.find(filter).sort(sortOrder);

    res.status(200).json({ success: true, count: suppliers.length, data: suppliers });
  } catch (err) {
    next(err);
  }
};

const getSupplierDebtSummary = async (req, res, next) => {
  try {
    const totals = await Supplier.aggregate([
      { $match: { organizationId: req.user.organizationId } },
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

const getSupplierById = async (req, res, next) => {
  try {
    const supplier = await Supplier.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId,
    });
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }
    res.status(200).json({ success: true, data: supplier });
  } catch (err) {
    next(err);
  }
};

const createSupplier = async (req, res, next) => {
  try {
    const { name, contactPerson, phone, email, address, notes } = req.body;
    const supplier = await Supplier.create({
      organizationId: req.user.organizationId,
      name,
      contactPerson,
      phone,
      email,
      address,
      notes,
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: supplier });
  } catch (err) {
    next(err);
  }
};

const updateSupplier = async (req, res, next) => {
  try {
    const supplier = await Supplier.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId,
    });
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    const keys = ['name', 'contactPerson', 'phone', 'email', 'address', 'notes'];
    keys.forEach((k) => {
      if (req.body[k] !== undefined) supplier[k] = req.body[k];
    });

    await supplier.save();
    res.status(200).json({ success: true, data: supplier });
  } catch (err) {
    next(err);
  }
};

const deleteSupplier = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const supplier = await Supplier.findOne({ _id: req.params.id, organizationId: orgId });
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    const linkedPurchases = await Purchase.countDocuments({
      organizationId: orgId,
      supplier: supplier._id,
    });
    if (linkedPurchases > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete supplier. ${linkedPurchases} purchase bill(s) are linked to this supplier.`,
      });
    }

    await supplier.deleteOne();
    res.status(200).json({ success: true, message: 'Supplier deleted' });
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