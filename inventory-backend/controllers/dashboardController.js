const { Item } = require('../models/Item');
const { Supplier } = require('../models/Supplier');
const { Transaction } = require('../models/Transaction');
const { Purchase } = require('../models/Purchase');

const getDashboardStats = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;

    const [inventoryStats] = await Item.aggregate([
      { $match: { organizationId: orgId } },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          totalUnits: { $sum: '$quantity' },
          totalValuation: { $sum: { $multiply: ['$quantity', '$unitPrice'] } },
          lowStockCount: {
            $sum: {
              $cond: [{ $lte: ['$quantity', '$lowStockThreshold'] }, 1, 0],
            },
          },
        },
      },
    ]);

    const [supplierStats] = await Supplier.aggregate([
      { $match: { organizationId: orgId } },
      {
        $group: {
          _id: null,
          totalSuppliers: { $sum: 1 },
          totalBilled: { $sum: '$totalBilled' },
          totalPaid: { $sum: '$totalPaid' },
          totalBalanceDue: { $sum: '$balanceDue' },
        },
      },
    ]);

    const totalPurchases = await Purchase.countDocuments({ organizationId: orgId });

    const criticalItems = await Item.find({
      organizationId: orgId,
      $expr: { $lte: ['$quantity', '$lowStockThreshold'] },
    })
      .populate('category', 'name')
      .sort({ quantity: 1 })
      .limit(5);

    const recentActivity = await Transaction.find({ organizationId: orgId })
      .populate('item', 'name sku unit')
      .populate('performedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      data: {
        inventory: {
          totalProducts: inventoryStats?.totalProducts || 0,
          totalUnits: inventoryStats?.totalUnits || 0,
          totalValuation: inventoryStats?.totalValuation || 0,
          lowStockCount: inventoryStats?.lowStockCount || 0,
        },
        financials: {
          totalSuppliers: supplierStats?.totalSuppliers || 0,
          totalBilled: supplierStats?.totalBilled || 0,
          totalPaid: supplierStats?.totalPaid || 0,
          totalOwedToDealers: supplierStats?.totalBalanceDue || 0,
          totalPurchases,
        },
        criticalItems,
        recentActivity,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getDashboardStats };