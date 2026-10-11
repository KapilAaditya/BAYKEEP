import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import {
  Boxes,
  Search,
  Plus,
  Filter,
  AlertTriangle,
  ArrowUpDown,
  Edit2,
  Trash2,
  X,
  Check,
  RefreshCw,
} from 'lucide-react';

const Inventory = () => {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [showLowStockOnly, setShowLowStockOnly] = useState(searchParams.get('lowStock') === 'true');

  // Modal States
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [stockActionType, setStockActionType] = useState('IN');
  const [stockQuantity, setStockQuantity] = useState(1);
  const [stockReason, setStockReason] = useState('');

  // Form State for Add/Edit Item
  const [itemForm, setItemForm] = useState({
    sku: '',
    name: '',
    description: '',
    category: '',
    quantity: 0,
    unit: 'pcs',
    unitPrice: 0,
    lowStockThreshold: 5, // Custom limit set by user
    location: 'Warehouse A',
  });
  const [formError, setFormError] = useState('');

  const { isManager, isAdmin } = useAuth();

  // Fetch Items from Backend
  const fetchItems = async () => {
    try {
      setLoading(true);
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (selectedCategory) params.category = selectedCategory;
      if (showLowStockOnly) params.lowStock = 'true';

      const res = await api.get('/items', { params });
      setItems(res.data.data);
    } catch (err) {
      console.error('Failed to fetch items:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Categories for Dropdown
  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories');
      setCategories(res.data.data);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchItems();
  }, [searchTerm, selectedCategory, showLowStockOnly]);

  // Open modal to create a new item
  const handleOpenCreateModal = () => {
    setSelectedItem(null);
    setItemForm({
      sku: '',
      name: '',
      description: '',
      category: categories[0]?._id || '',
      quantity: 0,
      unit: 'pcs',
      unitPrice: 0,
      lowStockThreshold: 5,
      location: 'Main Shelf',
    });
    setFormError('');
    setIsItemModalOpen(true);
  };

  // Open modal to edit an existing item
  const handleOpenEditModal = (item) => {
    setSelectedItem(item);
    setItemForm({
      sku: item.sku,
      name: item.name,
      description: item.description || '',
      category: item.category?._id || item.category,
      quantity: item.quantity,
      unit: item.unit || 'pcs',
      unitPrice: item.unitPrice || 0,
      lowStockThreshold: item.lowStockThreshold || 5,
      location: item.location || '',
    });
    setFormError('');
    setIsItemModalOpen(true);
  };

  // Save Item (Create or Update)
  const handleSaveItem = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      if (selectedItem) {
        await api.put(`/items/${selectedItem._id}`, itemForm);
      } else {
        await api.post('/items', itemForm);
      }
      setIsItemModalOpen(false);
      fetchItems();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save item');
    }
  };

  // Delete Item
  const handleDeleteItem = async (id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    try {
      await api.delete(`/items/${id}`);
      fetchItems();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete item');
    }
  };

  // Quick Stock Adjustment
  const handleOpenStockModal = (item, type) => {
    setSelectedItem(item);
    setStockActionType(type);
    setStockQuantity(1);
    setStockReason(type === 'IN' ? 'Restock / Shipment arrival' : 'Dispatched / Customer Sale');
    setIsStockModalOpen(true);
  };

  const handleSaveStockMovement = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/transactions/item/${selectedItem._id}`, {
        type: stockActionType,
        quantity: Number(stockQuantity),
        reason: stockReason,
      });
      setIsStockModalOpen(false);
      fetchItems();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update stock');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Inventory Catalog</h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time stock tracking with custom threshold alerts
          </p>
        </div>
        {isManager && (
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
          >
            <Plus className="h-4 w-4" />
            <span>Add New Item</span>
          </button>
        )}
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by product name or SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:border-indigo-600 placeholder:text-slate-400"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3.5 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600 text-slate-700"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>

        {/* Low Stock Toggle Button */}
        <button
          onClick={() => setShowLowStockOnly(!showLowStockOnly)}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg border transition ${
            showLowStockOnly
              ? 'bg-rose-50 text-rose-700 border-rose-300 ring-1 ring-rose-300'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <AlertTriangle className={`h-3.5 w-3.5 ${showLowStockOnly ? 'text-rose-600' : 'text-slate-400'}`} />
          <span>Low Stock Only</span>
        </button>
      </div>

      {/* Products Data Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Item Details</th>
                <th className="px-4 py-4">Category</th>
                <th className="px-4 py-4">Location</th>
                <th className="px-4 py-4">Unit Price</th>
                <th className="px-4 py-4">Stock Level</th>
                <th className="px-4 py-4 text-center">Alert Limit</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-400">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto text-indigo-600" />
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-12 text-center text-slate-400">
                    No items found matching your filters.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const isRed = item.isLowStock;
                  return (
                    <tr
                      key={item._id}
                      className={`transition-colors ${
                        isRed
                          ? 'bg-rose-50/70 hover:bg-rose-50 border-l-4 border-l-rose-500'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      {/* Name & SKU */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {isRed && (
                            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" title="Low stock threshold reached!" />
                          )}
                          <div>
                            <span className="font-semibold text-slate-900 block">{item.name}</span>
                            <span className="text-xs font-mono text-slate-400">{item.sku}</span>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-4 text-slate-600 text-xs">
                        <span className="inline-block px-2.5 py-1 rounded-md bg-slate-100 font-medium">
                          {item.category?.name || 'Uncategorized'}
                        </span>
                      </td>

                      {/* Location */}
                      <td className="px-4 py-4 text-slate-500 text-xs">{item.location || '—'}</td>

                      {/* Price */}
                      <td className="px-4 py-4 font-medium text-slate-800">
                        ₹{(item.unitPrice || 0).toLocaleString()}
                      </td>

                      {/* Stock Level with Red State */}
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            isRed
                              ? 'bg-rose-100 text-rose-700 border border-rose-300'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {item.quantity} {item.unit}
                        </span>
                      </td>

                      {/* Alert Limit set by user */}
                      <td className="px-4 py-4 text-center font-mono text-xs text-slate-500">
                        {item.lowStockThreshold} {item.unit}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right space-x-1 whitespace-nowrap">
                        {/* Quick Stock-In / Stock-Out */}
                        <button
                          onClick={() => handleOpenStockModal(item, 'IN')}
                          title="Stock In (+)"
                          className="px-2 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition"
                        >
                          + Stock
                        </button>
                        <button
                          onClick={() => handleOpenStockModal(item, 'OUT')}
                          title="Stock Out (-)"
                          className="px-2 py-1 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-md transition"
                        >
                          - Dispatch
                        </button>

                        {isManager && (
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            title="Edit Item"
                            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                        )}

                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteItem(item._id)}
                            title="Delete Item"
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Item Modal */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {selectedItem ? 'Edit Product Details' : 'Add New Product'}
              </h3>
              <button onClick={() => setIsItemModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="my-4 p-3 rounded-lg bg-red-50 text-red-700 text-xs border border-red-200">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveItem} className="mt-4 space-y-4 text-xs font-semibold uppercase tracking-wider text-slate-600">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1">SKU Code *</label>
                  <input
                    type="text"
                    required
                    value={itemForm.sku}
                    onChange={(e) => setItemForm({ ...itemForm, sku: e.target.value })}
                    placeholder="e.g. ELEC-001"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 normal-case font-normal text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  />
                </div>
                <div>
                  <label className="block mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={itemForm.name}
                    onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                    placeholder="e.g. Copper Wire 5mm"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 normal-case font-normal text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1">Category *</label>
                  <select
                    required
                    value={itemForm.category}
                    onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 bg-white normal-case font-normal text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block mb-1">Storage Location</label>
                  <input
                    type="text"
                    value={itemForm.location}
                    onChange={(e) => setItemForm({ ...itemForm, location: e.target.value })}
                    placeholder="e.g. Rack B, Shelf 4"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 normal-case font-normal text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block mb-1">Initial Stock</label>
                  <input
                    type="number"
                    min="0"
                    disabled={!!selectedItem}
                    value={itemForm.quantity}
                    onChange={(e) => setItemForm({ ...itemForm, quantity: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 normal-case font-normal text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-600 disabled:bg-slate-100"
                  />
                </div>
                <div>
                  <label className="block mb-1">Unit</label>
                  <input
                    type="text"
                    value={itemForm.unit}
                    onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
                    placeholder="pcs, kg, m"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 normal-case font-normal text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  />
                </div>
                <div>
                  <label className="block mb-1">Unit Price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={itemForm.unitPrice}
                    onChange={(e) => setItemForm({ ...itemForm, unitPrice: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 normal-case font-normal text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  />
                </div>
              </div>

              {/* Custom Alert Limit */}
              <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80">
                <label className="block text-amber-900 mb-1">
                  Custom Alert Limit (Turn Red When Stock Reaches) *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={itemForm.lowStockThreshold}
                  onChange={(e) => setItemForm({ ...itemForm, lowStockThreshold: Number(e.target.value) })}
                  className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 normal-case font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <p className="text-[11px] normal-case font-normal text-amber-800 mt-1">
                  When available quantity is at or below this value, the item turns red on the dashboard and inventory table.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Stock-In / Stock-Out Modal */}
      {isStockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-slate-100 p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {stockActionType === 'IN' ? 'Stock In (+)' : 'Dispatch / Stock Out (-)'}
              </h3>
              <button onClick={() => setIsStockModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="py-3">
              <p className="text-xs text-slate-400 uppercase font-semibold">Product</p>
              <h4 className="text-sm font-bold text-slate-900 mt-0.5">{selectedItem?.name}</h4>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Current count: <span className="font-bold text-slate-900">{selectedItem?.quantity} {selectedItem?.unit}</span>
              </p>
            </div>

            <form onSubmit={handleSaveStockMovement} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                  Quantity ({selectedItem?.unit})
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                  Reason / Notes
                </label>
                <input
                  type="text"
                  required
                  value={stockReason}
                  onChange={(e) => setStockReason(e.target.value)}
                  placeholder="e.g. Shipment arrival, Retail dispatch..."
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsStockModalOpen(false)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-1.5 text-xs font-semibold text-white rounded-lg transition ${
                    stockActionType === 'IN' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'
                  }`}
                >
                  Confirm {stockActionType}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;