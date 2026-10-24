const { Purchase } = require('../models/Purchase');
const { Supplier } = require('../models/Supplier');
const { Item } = require('../models/Item');
const { Transaction } = require('../models/Transaction');
const { SupplierPayment } = require('../models/SupplierPayment');
const { User } = require('../models/User');

const createPurchase = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const {
      billNumber,
      supplier: supplierId,
      items,
      paidAmount = 0,
      paymentMethod = 'CREDIT',
      purchaseDate,
      notes,
    } = req.body;

    const supplier = await Supplier.findOne({ _id: supplierId, organizationId: orgId });
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Dealer not found' });
    }

    let totalBillAmount = 0;
    const processedItems = [];

    for (const entry of items) {
      const dbItem = await Item.findOne({ _id: entry.item, organizationId: orgId });
      if (!dbItem) {
        return res.status(404).json({
          success: false,
          message: `Item ID '${entry.item}' was not found in your workspace`,
        });
      }

      const qty = Number(entry.quantity);
      const cost = Number(entry.unitCost);
      const lineTotal = qty * cost;
      totalBillAmount += lineTotal;

      processedItems.push({
        item: dbItem._id,
        quantity: qty,
        unitCost: cost,
        totalCost: lineTotal,
      });

      const previousQuantity = dbItem.quantity;
      dbItem.quantity += qty;
      await dbItem.save();

      await Transaction.create({
        organizationId: orgId,
        item: dbItem._id,
        type: 'IN',
        quantityChanged: qty,
        previousQuantity,
        newQuantity: dbItem.quantity,
        reason: `Purchase Bill #${billNumber} from ${supplier.name}`,
        performedBy: req.user._id,
      });
    }

    const numericPaid = Number(paidAmount) || 0;
    const balanceAmount = Math.max(0, totalBillAmount - numericPaid);
    let paymentStatus = 'UNPAID';
    if (numericPaid >= totalBillAmount) {
      paymentStatus = 'PAID';
    } else if (numericPaid > 0) {
      paymentStatus = 'PARTIALLY_PAID';
    }

    const purchase = await Purchase.create({
      organizationId: orgId,
      billNumber,
      supplier: supplier._id,
      items: processedItems,
      totalAmount: totalBillAmount,
      paidAmount: numericPaid,
      balanceAmount,
      paymentStatus,
      purchaseDate: purchaseDate || new Date(),
      notes,
      createdBy: req.user._id,
    });

    supplier.totalBilled += totalBillAmount;
    supplier.totalPaid += numericPaid;
    supplier.balanceDue += balanceAmount;
    await supplier.save();

    if (numericPaid > 0) {
      await SupplierPayment.create({
        organizationId: orgId,
        supplier: supplier._id,
        purchase: purchase._id,
        amountPaid: numericPaid,
        paymentMethod: paymentMethod === 'CREDIT' ? 'CASH' : paymentMethod,
        notes: `Initial payment against Bill #${billNumber}`,
        recordedBy: req.user._id,
      });
    }

    const populated = await purchase.populate([
      { path: 'supplier', select: 'name phone' },
      { path: 'items.item', select: 'name sku unit' },
    ]);

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};

const getPurchases = async (req, res, next) => {
  try {
    const { supplier, status, page = 1, limit = 20 } = req.query;
    const query = { organizationId: req.user.organizationId };
    if (supplier) query.supplier = supplier;
    if (status) query.paymentStatus = status;

    const skip = (Number(page) - 1) * Number(limit);
    const [purchases, total] = await Promise.all([
      Purchase.find(query)
        .populate('supplier', 'name phone')
        .populate('items.item', 'name sku unit')
        .populate('createdBy', 'name')
        .sort({ purchaseDate: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Purchase.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      count: purchases.length,
      total,
      data: purchases,
    });
  } catch (error) {
    next(error);
  }
};

const getPurchaseById = async (req, res, next) => {
  try {
    const purchase = await Purchase.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId,
    })
      .populate('supplier', 'name phone email address')
      .populate('items.item', 'name sku unit unitPrice')
      .populate('createdBy', 'name email');

    if (!purchase) {
      return res.status(404).json({ success: false, message: 'Purchase bill not found' });
    }
    res.status(200).json({ success: true, data: purchase });
  } catch (error) {
    next(error);
  }
};

const deletePurchase = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const purchase = await Purchase.findOne({
      _id: req.params.id,
      organizationId: orgId,
    });
    if (!purchase) {
      return res.status(404).json({ success: false, message: 'Purchase bill not found' });
    }

    for (const entry of purchase.items) {
      const item = await Item.findOne({ _id: entry.item, organizationId: orgId });
      if (item) {
        const previousQuantity = item.quantity;
        item.quantity = Math.max(0, item.quantity - entry.quantity);
        await item.save();

        await Transaction.create({
          organizationId: orgId,
          item: item._id,
          type: 'OUT',
          quantityChanged: -entry.quantity,
          previousQuantity,
          newQuantity: item.quantity,
          reason: `Deleted/Cancelled Purchase Bill #${purchase.billNumber}`,
          performedBy: req.user._id,
        });
      }
    }

    const supplier = await Supplier.findOne({
      _id: purchase.supplier,
      organizationId: orgId,
    });
    if (supplier) {
      supplier.totalBilled = Math.max(0, supplier.totalBilled - purchase.totalAmount);
      supplier.totalPaid = Math.max(0, supplier.totalPaid - purchase.paidAmount);
      supplier.balanceDue = Math.max(0, supplier.balanceDue - purchase.balanceAmount);
      await supplier.save();
    }

    await SupplierPayment.deleteMany({
      organizationId: orgId,
      purchase: purchase._id,
    });

    await purchase.deleteOne();

    res.status(200).json({
      success: true,
      message: `Purchase bill #${purchase.billNumber} deleted and stock/balances reverted.`,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { createPurchase, getPurchases, getPurchaseById, deletePurchase };