import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import {
  Boxes,
  AlertTriangle,
  CreditCard,
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  PlusCircle,
  ExternalLink,
} from 'lucide-react';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/dashboard/stats');
      setStats(res.data.data);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      setError('Unable to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
        <p className="font-semibold">{error}</p>
        <button
          onClick={fetchStats}
          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  const { inventory, financials, criticalItems, recentActivity } = stats || {};

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Live overview of inventory, stock alerts, and payables</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchStats}
            title="Refresh statistics"
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </button>
          <Link
            to="/inventory"
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>Manage Inventory</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total Products */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Products</span>
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
              <Boxes className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-slate-900">{inventory?.totalProducts || 0}</h3>
            <p className="text-xs text-slate-500 mt-1">{inventory?.totalUnits?.toLocaleString() || 0} total units in stock</p>
          </div>
        </div>

        {/* Card 2: Low Stock Warnings (RED) */}
        <div className="bg-white p-5 rounded-xl border border-rose-200/80 shadow-xs bg-rose-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-600">Low Stock Alert</span>
            <div className="rounded-lg bg-rose-100 p-2 text-rose-600">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-rose-700">{inventory?.lowStockCount || 0}</h3>
            <p className="text-xs text-rose-600 font-medium mt-1">Items at or below critical threshold</p>
          </div>
        </div>

        {/* Card 3: Total Money Owed to Dealers */}
        <div className="bg-white p-5 rounded-xl border border-amber-200/80 shadow-xs bg-amber-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">Total Money Owed</span>
            <div className="rounded-lg bg-amber-100 p-2 text-amber-700">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-amber-900">
              ₹{(financials?.totalOwedToDealers || 0).toLocaleString()}
            </h3>
            <p className="text-xs text-amber-700 font-medium mt-1">Across {financials?.totalSuppliers || 0} dealers</p>
          </div>
        </div>

        {/* Card 4: Inventory Asset Value */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Stock Valuation</span>
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-slate-900">
              ₹{(inventory?.totalValuation || 0).toLocaleString()}
            </h3>
            <p className="text-xs text-emerald-600 font-medium mt-1">Total active asset value</p>
          </div>
        </div>
      </div>

      {/* Two-Column Detail View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Critical Low-Stock Items Table */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse"></span>
              <h2 className="text-base font-semibold text-slate-900">Critical Stock Attention</h2>
            </div>
            <Link to="/inventory?lowStock=true" className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
              <span>View all</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {criticalItems && criticalItems.length > 0 ? (
              criticalItems.map((item) => (
                <div key={item._id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">{item.name}</h4>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">SKU: {item.sku}</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700">
                      {item.quantity} {item.unit} left
                    </span>
                    <p className="text-[11px] text-slate-400 mt-1">Limit: {item.lowStockThreshold} {item.unit}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-sm text-slate-400">
                No items are currently below their low-stock threshold.
              </div>
            )}
          </div>
        </div>

        {/* Recent Stock Movement Feed */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Recent Stock Movements</h2>
            <span className="text-xs text-slate-400">Live transaction stream</span>
          </div>

          <div className="divide-y divide-slate-100">
            {recentActivity && recentActivity.length > 0 ? (
              recentActivity.map((tx) => {
                const isPositive = tx.type === 'IN';
                const isOut = tx.type === 'OUT';
                return (
                  <div key={tx._id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-lg ${
                          isPositive
                            ? 'bg-emerald-50 text-emerald-600'
                            : isOut
                            ? 'bg-rose-50 text-rose-600'
                            : 'bg-blue-50 text-blue-600'
                        }`}
                      >
                        {isPositive ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900">{tx.item?.name || 'Deleted Item'}</h4>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {tx.reason} by {tx.performedBy?.name || 'Staff'}
                        </p>
                      </div>
                    </div>
                    
                    {/* Integrated custom right-side details block */}
                    <div className="text-right">
                      <span
                        className={`text-sm font-bold ${
                          isPositive ? 'text-emerald-600' : isOut ? 'text-rose-600' : 'text-blue-600'
                        }`}
                      >
                        {isPositive ? `+${tx.quantityChanged}` : tx.quantityChanged} {tx.item?.unit || ''}
                      </span>
                      {isOut && tx.totalSaleAmount > 0 && (
                        <p className="text-[11px] font-semibold text-emerald-700 mt-0.5">
                          Sold: ₹{tx.totalSaleAmount.toLocaleString()} (Eval -₹{(tx.costDeducted || 0).toLocaleString()})
                        </p>
                      )}
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        New total: {tx.newQuantity}
                      </p>
                    </div>

                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-sm text-slate-400">
                No recent stock movements recorded.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;