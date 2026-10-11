const { Item } = require('../models/Item');
const { Supplier } = require('../models/Supplier');
const { Transaction } = require('../models/Transaction');
const { Purchase } = require('../models/Purchase');

/**
 * @desc    Get aggregated dashboard KPIs and overview metrics
 * @route   GET /api/dashboard/stats
 * @access  Private
 */
const getDashboardStats = async (req, res, next) => {
  try {
    // 1. Inventory Aggregations: Total items, total units, valuation, low stock count
    const [inventoryStats] = await Item.aggregate([
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

    // 2. Dealer Payables Aggregations: Total debt owed and total paid
    const [supplierStats] = await Supplier.aggregate([
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

    // 3. Purchase Bills Count
    const totalPurchases = await Purchase.countDocuments({});

    // 4. Critical Red Items (top 5 lowest stock items for quick dashboard table)
    const criticalItems = await Item.find({
      $expr: { $lte: ['$quantity', '$lowStockThreshold'] },
    })
      .populate('category', 'name')
      .sort({ quantity: 1 })
      .limit(5);

    // 5. Recent Activity (last 5 stock transactions)
    const recentActivity = await Transaction.find({})
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
          lowStockCount: inventoryStats?.lowStockCount || 0, // Number of items in red state
        },
        financials: {
          totalSuppliers: supplierStats?.totalSuppliers || 0,
          totalBilled: supplierStats?.totalBilled || 0,
          totalPaid: supplierStats?.totalPaid || 0,
          totalOwedToDealers: supplierStats?.totalBalanceDue || 0, // Overall debt
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

module.exports = {
  getDashboardStats,
};