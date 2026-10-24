const { Transaction } = require('../models/Transaction');
const { Item } = require('../models/Item');

const recordStockMovement = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const { itemId } = req.params;
    const { type, quantity, reason } = req.body;

    const item = await Item.findOne({ _id: itemId, organizationId: orgId });
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    const previousQuantity = item.quantity;
    let newQuantity = previousQuantity;
    let quantityChanged = 0;

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
      reason: reason || `${type} operation recorded`,
      performedBy: req.user._id,
    });

    const populated = await transaction.populate([
      { path: 'performedBy', select: 'name email role' },
      { path: 'item', select: 'name sku unit' },
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
        .populate('item', 'name sku unit')
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