const { Item } = require('../models/Item');
const { Category } = require('../models/Category');
const { Transaction } = require('../models/Transaction');

/**
 * @desc    Get all items with search, category filtering, and pagination
 * @route   GET /api/items
 * @access  Private
 */
const getItems = async (req, res, next) => {
  try {
    const { search, category, lowStock, page = 1, limit = 20 } = req.query;

    const query = {};

    // 1. Text search across name or SKU
    if (search) {
      query.$or = [
        { name: { $regex: search,$options: 'i' } },
        { sku: { $regex: search,$options: 'i' } },
      ];
    }

    // 2. Category filter
    if (category) {
      query.category = category;
    }

    // 3. Low stock filter (items at or below user-defined threshold)
    if (lowStock === 'true') {
      query.$expr = {$lte: ['$quantity', '$lowStockThreshold'] };
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

/**
 * @desc    Get all low-stock items (items in red state)
 * @route   GET /api/items/low-stock
 * @access  Private
 */
const getLowStockItems = async (req, res, next) => {
  try {
    const lowStockItems = await Item.find({
      $expr: {$lte: ['$quantity', '$lowStockThreshold'] },
    })
      .populate('category', 'name')
      .sort({ quantity: 1 }); // Lowest quantity first

    res.status(200).json({
      success: true,
      count: lowStockItems.length,
      data: lowStockItems,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single item by ID
 * @route   GET /api/items/:id
 * @access  Private
 */
const getItemById = async (req, res, next) => {
  try {
    const item = await Item.findById(req.params.id)
      .populate('category', 'name description')
      .populate('createdBy', 'name email');

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found',
      });
    }

    res.status(200).json({
      success: true,
      data: item,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new inventory item
 * @route   POST /api/items
 * @access  Private (Admin, Manager)
 */
const createItem = async (req, res, next) => {
  try {
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

    // Check SKU uniqueness
    const skuExists = await Item.findOne({ sku: sku.toUpperCase() });
    if (skuExists) {
      return res.status(400).json({
        success: false,
        message: `An item with SKU '${sku}' already exists`,
      });
    }

    // Verify category exists
    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category specified',
      });
    }

    // Create item
    const item = await Item.create({
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

    // If item was created with starting quantity > 0, log initial audit movement
    if (quantity > 0) {
      await Transaction.create({
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

    res.status(201).json({
      success: true,
      message: 'Item created successfully',
      data: populatedItem,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update item details
 * @route   PUT /api/items/:id
 * @access  Private (Admin, Manager)
 */
const updateItem = async (req, res, next) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found',
      });
    }

    // Check SKU conflict if updating SKU
    if (req.body.sku && req.body.sku.toUpperCase() !== item.sku) {
      const skuExists = await Item.findOne({ sku: req.body.sku.toUpperCase() });
      if (skuExists) {
        return res.status(400).json({
          success: false,
          message: `SKU '${req.body.sku}' is already taken by another item`,
        });
      }
    }

    // Update allowable fields
    const fieldsToUpdate = [
      'sku',
      'name',
      'description',
      'category',
      'unit',
      'unitPrice',
      'lowStockThreshold',
      'location',
    ];

    fieldsToUpdate.forEach((field) => {
      if (req.body[field] !== undefined) {
        item[field] = req.body[field];
      }
    });

    await item.save();

    const updatedItem = await Item.findById(item._id).populate(
      'category',
      'name'
    );

    res.status(200).json({
      success: true,
      message: 'Item updated successfully',
      data: updatedItem,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete an item
 * @route   DELETE /api/items/:id
 * @access  Private (Admin)
 */
const deleteItem = async (req, res, next) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found',
      });
    }

    await item.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Item deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getItems,
  getLowStockItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
};