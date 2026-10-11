const { SupplierPayment } = require('../models/SupplierPayment');
const { Supplier } = require('../models/Supplier');
const { Purchase } = require('../models/Purchase');

/**
 * @desc    Record a payment installment to a dealer
 * @route   POST /api/supplier-payments
 * @access  Private (Admin, Manager)
 */
const recordPayment = async (req, res, next) => {
  try {
    const {
      supplier: supplierId,
      purchase: purchaseId,
      amountPaid,
      paymentMethod = 'CASH',
      transactionReference,
      paymentDate,
      notes,
    } = req.body;

    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Dealer not found' });
    }

    // 1. If linked to a specific purchase invoice, update that invoice balance
    if (purchaseId) {
      const purchase = await Purchase.findById(purchaseId);
      if (purchase) {
        purchase.paidAmount += amountPaid;
        purchase.balanceAmount = Math.max(0, purchase.totalAmount - purchase.paidAmount);
        purchase.paymentStatus =
          purchase.balanceAmount === 0 ? 'PAID' : 'PARTIALLY_PAID';
        await purchase.save();
      }
    }

    // 2. Deduct from dealer's total balance owed
    supplier.totalPaid += amountPaid;
    supplier.balanceDue = Math.max(0, supplier.balanceDue - amountPaid);
    await supplier.save();

    // 3. Create the payment record
    const payment = await SupplierPayment.create({
      supplier: supplier._id,
      purchase: purchaseId || undefined,
      amountPaid,
      paymentMethod,
      transactionReference,
      paymentDate: paymentDate || new Date(),
      notes,
      recordedBy: req.user._id,
    });

    const populatedPayment = await payment.populate([
      { path: 'supplier', select: 'name phone' },
      { path: 'recordedBy', select: 'name' },
    ]);

    res.status(201).json({
      success: true,
      message: `Payment of ${amountPaid} recorded for ${supplier.name}`,
      data: {
        payment: populatedPayment,
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

/**
 * @desc    Get complete payment history and count for a specific dealer
 * @route   GET /api/supplier-payments/supplier/:supplierId
 * @access  Private
 */
const getSupplierPaymentHistory = async (req, res, next) => {
  try {
    const { supplierId } = req.params;

    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Dealer not found' });
    }

    // Fetch all payment installments made to this dealer
    const payments = await SupplierPayment.find({ supplier: supplierId })
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
        // How many times you have paid this dealer
        timesPaidCount: payments.length,
        // Chronological list of every payment installment
        paymentLedger: payments,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get global payment transactions across all dealers
 * @route   GET /api/supplier-payments
 * @access  Private
 */
const getAllPayments = async (req, res, next) => {
  try {
    const { page = 1, limit = 25 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [payments, total] = await Promise.all([
      SupplierPayment.find({})
        .populate('supplier', 'name phone')
        .populate('recordedBy', 'name')
        .sort({ paymentDate: -1 })
        .skip(skip)
        .limit(Number(limit)),
      SupplierPayment.countDocuments({}),
    ]);

    res.status(200).json({
      success: true,
      count: payments.length,
      total,
      data: payments,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  recordPayment,
  getSupplierPaymentHistory,
  getAllPayments,
};