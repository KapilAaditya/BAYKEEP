const { Transaction } = require('../models/Transaction');
const { Item } = require('../models/Item');

/**
 * @desc    Record a stock movement (IN, OUT, ADJUSTMENT)
 * @route   POST /api/transactions/item/:itemId
 * @access  Private (All authenticated users can log stock changes)
 */
const recordStockMovement = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const { type, quantity, reason } = req.body;

    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found',
      });
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
          message: `Insufficient stock. Current available quantity is ${previousQuantity}, cannot dispatch ${quantity}.`,
        });
      }
      newQuantity = previousQuantity - quantity;
      quantityChanged = -quantity;
    } else if (type === 'ADJUSTMENT') {
      // In ADJUSTMENT, quantity is passed as the new verified physical count
      newQuantity = quantity;
      quantityChanged = newQuantity - previousQuantity;
    }

    // 1. Update the item's live stock
    item.quantity = newQuantity;
    await item.save();

    // 2. Create the immutable audit log entry
    const transaction = await Transaction.create({
      item: item._id,
      type,
      quantityChanged,
      previousQuantity,
      newQuantity,
      reason: reason || `${type} operation recorded`,
      performedBy: req.user._id,
    });

    const populatedTransaction = await transaction.populate([
      { path: 'performedBy', select: 'name email role' },
      { path: 'item', select: 'name sku unit' },
    ]);

    res.status(201).json({
      success: true,
      message: `Stock updated successfully (${type})`,
      data: {
        item: {
          _id: item._id,
          name: item.name,
          sku: item.sku,
          previousQuantity,
          newQuantity: item.quantity,
          isLowStock: item.isLowStock, // Automatically re-evaluates low stock flag
        },
        transaction: populatedTransaction,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all transactions (audit log) with filters and pagination
 * @route   GET /api/transactions
 * @access  Private (Admin, Manager)
 */
const getTransactions = async (req, res, next) => {
  try {
    const { item, type, page = 1, limit = 25 } = req.query;

    const query = {};
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
      currentPage: Number(page),
      totalPages: Math.ceil(totalTransactions / Number(limit)),
      data: transactions,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get stock movement history for a single specific item
 * @route   GET /api/transactions/item/:itemId
 * @access  Private
 */
const getItemTransactions = async (req, res, next) => {
  try {
    const { itemId } = req.params;

    const itemExists = await Item.exists({ _id: itemId });
    if (!itemExists) {
      return res.status(404).json({
        success: false,
        message: 'Item not found',
      });
    }

    const transactions = await Transaction.find({ item: itemId })
      .populate('performedBy', 'name email role')
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  recordStockMovement,
  getTransactions,
  getItemTransactions,
};