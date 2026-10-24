const { Transaction } = require('../models/Transaction');
const { Item } = require('../models/Item');

const recordStockMovement = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const { itemId } = req.params;
    const { type, quantity, sellingPrice = 0, reason } = req.body;

    const item = await Item.findOne({ _id: itemId, organizationId: orgId });
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    const previousQuantity = item.quantity;
    const purchaseUnitCost = item.unitPrice || 0;
    let newQuantity = previousQuantity;
    let quantityChanged = 0;
    let totalSaleAmount = 0;
    let costDeducted = 0;

    if (type === 'IN') {
      newQuantity = previousQuantity + quantity;
      quantityChanged = quantity;
    } else if (type === 'OUT') {
      if (previousQuantity < quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock. Available: ${previousQuantity}, Requested: ${quantity}.`,
        });
      }
      newQuantity = previousQuantity - quantity;
      quantityChanged = -quantity;
      totalSaleAmount = quantity * Number(sellingPrice);
      // Deduct the item's purchase cost from overall Stock Valuation
      costDeducted = quantity * purchaseUnitCost;
    } else if (type === 'ADJUSTMENT') {
      newQuantity = quantity;
      quantityChanged = newQuantity - previousQuantity;
    }

    item.quantity = newQuantity;
    await item.save();

    const transaction = await Transaction.create({
      organizationId: orgId,
      item: item._id,
      type,
      quantityChanged,
      previousQuantity,
      newQuantity,
      unitCost: purchaseUnitCost,
      sellingPrice: type === 'OUT' ? Number(sellingPrice) : 0,
      totalSaleAmount,
      costDeducted,
      reason:
        reason ||
        (type === 'OUT'
          ? `Sold ${quantity} ${item.unit} @ ₹${sellingPrice}/${item.unit}`
          : `${type} operation recorded`),
      performedBy: req.user._id,
    });

    const populated = await transaction.populate([
      { path: 'performedBy', select: 'name email role' },
      { path: 'item', select: 'name sku unit unitPrice' },
    ]);

    res.status(201).json({
      success: true,
      data: {
        item: {
          _id: item._id,
          name: item.name,
          sku: item.sku,
          previousQuantity,
          newQuantity: item.quantity,
          unitPrice: item.unitPrice,
          isLowStock: item.isLowStock,
        },
        transaction: populated,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getTransactions = async (req, res, next) => {
  try {
    const { item, type, page = 1, limit = 25 } = req.query;
    const query = { organizationId: req.user.organizationId };
    if (item) query.item = item;
    if (type) query.type = type;

    const skip = (Number(page) - 1) * Number(limit);
    const [transactions, totalTransactions] = await Promise.all([
      Transaction.find(query)
        .populate('item', 'name sku unit unitPrice')
        .populate('performedBy', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Transaction.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      count: transactions.length,
      totalTransactions,
      data: transactions,
    });
  } catch (error) {
    next(error);
  }
};

const getItemTransactions = async (req, res, next) => {
  try {
    const transactions = await Transaction.find({
      organizationId: req.user.organizationId,
      item: req.params.itemId,
    })
      .populate('performedBy', 'name email role')
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({ success: true, count: transactions.length, data: transactions });
  } catch (error) {
    next(error);
  }
};

module.exports = { recordStockMovement, getTransactions, getItemTransactions };