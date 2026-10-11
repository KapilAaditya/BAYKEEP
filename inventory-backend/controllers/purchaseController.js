const { Purchase } = require('../models/Purchase');
const { Supplier } = require('../models/Supplier');
const { Item } = require('../models/Item');
const { Transaction } = require('../models/Transaction');
const { SupplierPayment } = require('../models/SupplierPayment');
const { User } = require('../models/User'); // Ensures User schema is registered for populate

/**
 * @desc    Record a new purchase bill from a dealer
 * @route   POST /api/purchases
 * @access  Private (Admin, Manager)
 */
const createPurchase = async (req, res, next) => {
  try {
    const {
      billNumber,
      supplier: supplierId,
      items,
      paidAmount = 0,
      paymentMethod = 'CREDIT',
      purchaseDate,
      notes,
    } = req.body;

    // 1. Verify dealer exists
    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Dealer not found' });
    }

    // 2. Validate items, calculate line totals, and restock inventory
    let totalBillAmount = 0;
    const processedItems = [];

    for (const entry of items) {
      const dbItem = await Item.findById(entry.item);
      if (!dbItem) {
        return res.status(404).json({
          success: false,
          message: `Item ID '${entry.item}' was not found in catalog`,
        });
      }

      const lineTotal = Number(entry.quantity) * Number(entry.unitCost);
      totalBillAmount += lineTotal;

      processedItems.push({
        item: dbItem._id,
        quantity: Number(entry.quantity),
        unitCost: Number(entry.unitCost),
        totalCost: lineTotal,
      });

      // Update item stock count
      const previousQuantity = dbItem.quantity;
      dbItem.quantity += Number(entry.quantity);
      await dbItem.save();

      // Log stock-in transaction
      await Transaction.create({
        item: dbItem._id,
        type: 'IN',
        quantityChanged: Number(entry.quantity),
        previousQuantity,
        newQuantity: dbItem.quantity,
        reason: `Purchase Bill #${billNumber} from ${supplier.name}`,
        performedBy: req.user._id,
      });
    }

    // 3. Calculate balance and payment status
    const numericPaidAmount = Number(paidAmount) || 0;
    const balanceAmount = Math.max(0, totalBillAmount - numericPaidAmount);
    let paymentStatus = 'UNPAID';
    if (numericPaidAmount >= totalBillAmount) {
      paymentStatus = 'PAID';
    } else if (numericPaidAmount > 0) {
      paymentStatus = 'PARTIALLY_PAID';
    }

    // 4. Create the purchase bill record
    const purchase = await Purchase.create({
      billNumber,
      supplier: supplier._id,
      items: processedItems,
      totalAmount: totalBillAmount,
      paidAmount: numericPaidAmount,
      balanceAmount,
      paymentStatus,
      purchaseDate: purchaseDate || new Date(),
      notes,
      createdBy: req.user._id,
    });

    // 5. Update supplier running balance
    supplier.totalBilled += totalBillAmount;
    supplier.totalPaid += numericPaidAmount;
    supplier.balanceDue += balanceAmount;
    await supplier.save();

    // 6. If upfront payment was made, log it in payment ledger
    if (numericPaidAmount > 0) {
      await SupplierPayment.create({
        supplier: supplier._id,
        purchase: purchase._id,
        amountPaid: numericPaidAmount, // Fixed: was previously amountPaid instead of numericPaidAmount
        paymentMethod: paymentMethod === 'CREDIT' ? 'CASH' : paymentMethod,
        notes: `Initial payment against Bill #${billNumber}`,
        recordedBy: req.user._id,
      });
    }

    const populatedPurchase = await purchase.populate([
      { path: 'supplier', select: 'name phone' },
      { path: 'items.item', select: 'name sku unit' },
    ]);

    res.status(201).json({
      success: true,
      message: 'Purchase bill recorded and inventory restocked',
      data: populatedPurchase,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all purchase bills with supplier filter and pagination
 * @route   GET /api/purchases
 * @access  Private
 */
const getPurchases = async (req, res, next) => {
  try {
    const { supplier, status, page = 1, limit = 20 } = req.query;

    const query = {};
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
      currentPage: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      data: purchases,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single purchase bill by ID
 * @route   GET /api/purchases/:id
 * @access  Private
 */
const getPurchaseById = async (req, res, next) => {
  try {
    const purchase = await Purchase.findById(req.params.id)
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
/**
 * @desc    Delete/Void a purchase bill (Reverts stock, dealer balance, and payments)
 * @route   DELETE /api/purchases/:id
 * @access  Private (Admin, Manager)
 */
const deletePurchase = async (req, res, next) => {
  try {
    const purchase = await Purchase.findById(req.params.id);
    if (!purchase) {
      return res.status(404).json({ success: false, message: 'Purchase bill not found' });
    }

    // 1. Revert stock counts for all items in this bill
    for (const entry of purchase.items) {
      const item = await Item.findById(entry.item);
      if (item) {
        const previousQuantity = item.quantity;
        // Deduct the quantity that was added by this bill
        item.quantity = Math.max(0, item.quantity - entry.quantity);
        await item.save();

        // Log audit adjustment
        await Transaction.create({
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

    // 2. Revert supplier financial ledger
    const supplier = await Supplier.findById(purchase.supplier);
    if (supplier) {
      supplier.totalBilled = Math.max(0, supplier.totalBilled - purchase.totalAmount);
      supplier.totalPaid = Math.max(0, supplier.totalPaid - purchase.paidAmount);
      supplier.balanceDue = Math.max(0, supplier.balanceDue - purchase.balanceAmount);
      await supplier.save();
    }

    // 3. Delete any initial payment linked to this bill
    await SupplierPayment.deleteMany({ purchase: purchase._id });

    // 4. Delete the purchase bill document
    await purchase.deleteOne();

    res.status(200).json({
      success: true,
      message: `Purchase bill #${purchase.billNumber} deleted, inventory deducted, and dealer balance adjusted.`,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPurchase,
  getPurchases,
  getPurchaseById,
  deletePurchase, // Added
};

