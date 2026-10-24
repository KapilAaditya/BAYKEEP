const { SupplierPayment } = require('../models/SupplierPayment');
const { Supplier } = require('../models/Supplier');
const { Purchase } = require('../models/Purchase');

const recordPayment = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const {
      supplier: supplierId,
      purchase: purchaseId,
      amountPaid,
      paymentMethod = 'CASH',
      transactionReference,
      paymentDate,
      notes,
    } = req.body;

    const supplier = await Supplier.findOne({ _id: supplierId, organizationId: orgId });
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Dealer not found' });
    }

    if (purchaseId) {
      const purchase = await Purchase.findOne({ _id: purchaseId, organizationId: orgId });
      if (purchase) {
        purchase.paidAmount += amountPaid;
        purchase.balanceAmount = Math.max(0, purchase.totalAmount - purchase.paidAmount);
        purchase.paymentStatus = purchase.balanceAmount === 0 ? 'PAID' : 'PARTIALLY_PAID';
        await purchase.save();
      }
    }

    supplier.totalPaid += amountPaid;
    supplier.balanceDue = Math.max(0, supplier.balanceDue - amountPaid);
    await supplier.save();

    const payment = await SupplierPayment.create({
      organizationId: orgId,
      supplier: supplier._id,
      purchase: purchaseId || undefined,
      amountPaid,
      paymentMethod,
      transactionReference,
      paymentDate: paymentDate || new Date(),
      notes,
      recordedBy: req.user._id,
    });

    const populated = await payment.populate([
      { path: 'supplier', select: 'name phone' },
      { path: 'recordedBy', select: 'name' },
    ]);

    res.status(201).json({
      success: true,
      data: {
        payment: populated,
        updatedSupplier: {
          _id: supplier._id,
          name: supplier.name,
          totalBilled: supplier.totalBilled,
          totalPaid: supplier.totalPaid,
          remainingBalanceDue: supplier.balanceDue,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

const getSupplierPaymentHistory = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const { supplierId } = req.params;

    const supplier = await Supplier.findOne({ _id: supplierId, organizationId: orgId });
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Dealer not found' });
    }

    const payments = await SupplierPayment.find({
      organizationId: orgId,
      supplier: supplierId,
    })
      .populate('recordedBy', 'name email')
      .populate('purchase', 'billNumber totalAmount balanceAmount')
      .sort({ paymentDate: -1 });

    res.status(200).json({
      success: true,
      data: {
        dealerName: supplier.name,
        totalBilled: supplier.totalBilled,
        totalPaid: supplier.totalPaid,
        balanceDue: supplier.balanceDue,
        timesPaidCount: payments.length,
        paymentLedger: payments,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getAllPayments = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const { page = 1, limit = 25 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [payments, total] = await Promise.all([
      SupplierPayment.find({ organizationId: orgId })
        .populate('supplier', 'name phone')
        .populate('recordedBy', 'name')
        .sort({ paymentDate: -1 })
        .skip(skip)
        .limit(Number(limit)),
      SupplierPayment.countDocuments({ organizationId: orgId }),
    ]);

    res.status(200).json({ success: true, count: payments.length, total, data: payments });
  } catch (error) {
    next(error);
  }
};

module.exports = { recordPayment, getSupplierPaymentHistory, getAllPayments };