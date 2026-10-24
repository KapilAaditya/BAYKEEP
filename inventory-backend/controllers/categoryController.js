const { Category } = require('../models/Category');
const { Item } = require('../models/Item');

const getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({
      organizationId: req.user.organizationId,
    }).sort({ name: 1 });
    res.status(200).json({ success: true, count: categories.length, data: categories });
  } catch (error) {
    next(error);
  }
};

const createCategory = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const orgId = req.user.organizationId;

    const existing = await Category.findOne({
      organizationId: orgId,
      name: { $regex: new RegExp(`^${name}$`, 'i') },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A category with this name already exists in your workspace',
      });
    }

    const category = await Category.create({
      organizationId: orgId,
      name,
      description,
    });

    res.status(201).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

const updateCategory = async (req, res, next) => {
  try {
    const category = await Category.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId,
    });
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    if (req.body.name) category.name = req.body.name;
    if (req.body.description !== undefined) category.description = req.body.description;
    await category.save();

    res.status(200).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

const deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId,
    });
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const itemsCount = await Item.countDocuments({
      organizationId: req.user.organizationId,
      category: category._id,
    });
    if (itemsCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category. ${itemsCount} item(s) are linked to it.`,
      });
    }

    await category.deleteOne();
    res.status(200).json({ success: true, message: 'Category deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getCategories, createCategory, updateCategory, deleteCategory };