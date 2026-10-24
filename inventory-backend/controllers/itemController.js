const { Item } = require('../models/Item');
const { Category } = require('../models/Category');
const { Transaction } = require('../models/Transaction');

const getItems = async (req, res, next) => {
  try {
    const { search, category, lowStock, page = 1, limit = 20 } = req.query;
    const query = { organizationId: req.user.organizationId };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
      ];
    }
    if (category) query.category = category;
    if (lowStock === 'true') {
      query.$expr = { $lte: ['$quantity', '$lowStockThreshold'] };
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [items, totalItems] = await Promise.all([
      Item.find(query)
        .populate('category', 'name')
        .populate('createdBy', 'name')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Item.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      count: items.length,
      totalItems,
      currentPage: Number(page),
      totalPages: Math.ceil(totalItems / Number(limit)),
      data: items,
    });
  } catch (error) {
    next(error);
  }
};

const getLowStockItems = async (req, res, next) => {
  try {
    const lowStockItems = await Item.find({
      organizationId: req.user.organizationId,
      $expr: { $lte: ['$quantity', '$lowStockThreshold'] },
    })
      .populate('category', 'name')
      .sort({ quantity: 1 });

    res.status(200).json({ success: true, count: lowStockItems.length, data: lowStockItems });
  } catch (error) {
    next(error);
  }
};

const getItemById = async (req, res, next) => {
  try {
    const item = await Item.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId,
    })
      .populate('category', 'name description')
      .populate('createdBy', 'name email');

    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }
    res.status(200).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

const createItem = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const {
      sku,
      name,
      description,
      category,
      quantity = 0,
      unit = 'pcs',
      unitPrice = 0,
      lowStockThreshold = 5,
      location,
    } = req.body;

    const skuExists = await Item.findOne({
      organizationId: orgId,
      sku: sku.toUpperCase(),
    });
    if (skuExists) {
      return res.status(400).json({
        success: false,
        message: `An item with SKU '${sku}' already exists in your workspace`,
      });
    }

    const categoryExists = await Category.findOne({
      _id: category,
      organizationId: orgId,
    });
    if (!categoryExists) {
      return res.status(400).json({ success: false, message: 'Invalid category specified' });
    }

    const item = await Item.create({
      organizationId: orgId,
      sku,
      name,
      description,
      category,
      quantity,
      unit,
      unitPrice,
      lowStockThreshold,
      location,
      createdBy: req.user._id,
    });

    if (quantity > 0) {
      await Transaction.create({
        organizationId: orgId,
        item: item._id,
        type: 'IN',
        quantityChanged: quantity,
        previousQuantity: 0,
        newQuantity: quantity,
        reason: 'Initial stock on item creation',
        performedBy: req.user._id,
      });
    }

    const populatedItem = await item.populate('category', 'name');
    res.status(201).json({ success: true, data: populatedItem });
  } catch (error) {
    next(error);
  }
};

const updateItem = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const item = await Item.findOne({ _id: req.params.id, organizationId: orgId });
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    if (req.body.sku && req.body.sku.toUpperCase() !== item.sku) {
      const skuExists = await Item.findOne({
        organizationId: orgId,
        sku: req.body.sku.toUpperCase(),
      });
      if (skuExists) {
        return res.status(400).json({
          success: false,
          message: `SKU '${req.body.sku}' is already used in your workspace`,
        });
      }
    }

    const fields = ['sku', 'name', 'description', 'category', 'unit', 'unitPrice', 'lowStockThreshold', 'location'];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) item[f] = req.body[f];
    });

    await item.save();
    const updated = await Item.findById(item._id).populate('category', 'name');
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

const deleteItem = async (req, res, next) => {
  try {
    const item = await Item.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId,
    });
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }
    await item.deleteOne();
    res.status(200).json({ success: true, message: 'Item deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getItems, getLowStockItems, getItemById, createItem, updateItem, deleteItem };