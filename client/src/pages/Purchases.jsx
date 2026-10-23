import { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import {
  Receipt,
  Plus,
  Trash2,
  X,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

const Purchases = () => {
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [itemsList, setItemsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formError, setFormError] = useState('');

  // Form State
  const [supplierId, setSupplierId] = useState('');
  const [billNumber, setBillNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [paidAmount, setPaidAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('CREDIT');
  const [notes, setNotes] = useState('');

  // Dynamic Item Rows
  const [billItems, setBillItems] = useState([
    { item: '', quantity: 1, unitCost: 0, total: 0 },
  ]);

  const { isManager } = useAuth();

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/purchases', { params });
      setPurchases(res.data.data);
    } catch (err) {
      console.error('Failed to load purchases:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFormData = async () => {
    try {
      const [suppliersRes, itemsRes] = await Promise.all([
        api.get('/suppliers'),
        api.get('/items?limit=100'),
      ]);
      setSuppliers(suppliersRes.data.data);
      setItemsList(itemsRes.data.data);
    } catch (err) {
      console.error('Failed to load form dropdown data:', err);
    }
  };

  useEffect(() => {
    fetchPurchases();
    fetchFormData();
  }, [statusFilter]);

  // Handle Item Row Changes
  const handleItemChange = (index, field, value) => {
    const updated = [...billItems];
    updated[index][field] = value;

    if (field === 'item') {
      const selected = itemsList.find((i) => i._id === value);
      if (selected && (!updated[index].unitCost || updated[index].unitCost === 0)) {
        updated[index].unitCost = selected.unitPrice || 0;
      }
    }

    const qty = Number(updated[index].quantity) || 0;
    const cost = Number(updated[index].unitCost) || 0;
    updated[index].total = qty * cost;

    setBillItems(updated);
  };

  const addItemRow = () => {
    setBillItems([...billItems, { item: '', quantity: 1, unitCost: 0, total: 0 }]);
  };

  const removeItemRow = (index) => {
    if (billItems.length === 1) return;
    setBillItems(billItems.filter((_, i) => i !== index));
  };

  const totalBillAmount = billItems.reduce((acc, curr) => acc + (curr.total || 0), 0);

  const handleOpenModal = () => {
    setSupplierId(suppliers[0]?._id || '');
    setBillNumber(`INV-${Date.now().toString().slice(-6)}`);
    setPurchaseDate(new Date().toISOString().split('T')[0]);
    setPaidAmount(0);
    setPaymentMethod('CREDIT');
    setNotes('');
    setBillItems([
      {
        item: itemsList[0]?._id || '',
        quantity: 1,
        unitCost: itemsList[0]?.unitPrice || 0,
        total: itemsList[0]?.unitPrice || 0,
      },
    ]);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleCreatePurchase = async (e) => {
    e.preventDefault();
    setFormError('');

    for (const row of billItems) {
      if (!row.item) {
        setFormError('Please select a valid item for all rows');
        return;
      }
      if (row.quantity <= 0) {
        setFormError('Item quantity must be greater than zero');
        return;
      }
    }

    try {
      await api.post('/purchases', {
        billNumber,
        supplier: supplierId,
        items: billItems.map((r) => ({
          item: r.item,
          quantity: Number(r.quantity),
          unitCost: Number(r.unitCost),
        })),
        paidAmount: Number(paidAmount),
        paymentMethod,
        purchaseDate,
        notes,
      });

      setIsModalOpen(false);
      fetchPurchases();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to record purchase bill');
    }
  };

  // Delete / Void a Purchase Bill
  const handleDeletePurchase = async (bill) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete Bill #${bill.billNumber}?\n\nThis will automatically:\n1. Deduct the purchased quantities from inventory.\n2. Revert ₹${bill.totalAmount.toLocaleString()} from the dealer's account balance.`
    );

    if (!confirmDelete) return;

    try {
      await api.delete(`/purchases/${bill._id}`);
      fetchPurchases();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete purchase bill');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Purchase Bills</h1>
          <p className="text-sm text-slate-500 mt-1">
            Log dealer invoices to automatically restock items and update debt ledgers
          </p>
        </div>
        {isManager && (
          <button
            onClick={handleOpenModal}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
          >
            <Plus className="h-4 w-4" />
            <span>Record New Purchase</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase text-slate-400">Payment Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-600"
          >
            <option value="">All Statuses</option>
            <option value="UNPAID">Unpaid (Full Credit)</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="PAID">Fully Cleared (Paid)</option>
          </select>
        </div>
      </div>

      {/* Purchase Bills Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Bill # / Date</th>
                <th className="px-4 py-4">Dealer</th>
                <th className="px-4 py-4">Items Summary</th>
                <th className="px-4 py-4">Total Amount</th>
                <th className="px-4 py-4">Paid</th>
                <th className="px-4 py-4">Balance Owed</th>
                <th className="px-4 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-slate-400">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto text-indigo-600" />
                  </td>
                </tr>
              ) : purchases.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-12 text-center text-slate-400">
                    No purchase bills recorded yet.
                  </td>
                </tr>
              ) : (
                purchases.map((bill) => {
                  const isUnpaid = bill.paymentStatus === 'UNPAID';
                  const isPartial = bill.paymentStatus === 'PARTIALLY_PAID';
                  return (
                    <tr key={bill._id} className="hover:bg-slate-50/60 transition">
                      {/* Bill Number & Date */}
                      <td className="px-6 py-4">
                        <span className="font-bold text-slate-900 font-mono block">
                          {bill.billNumber}
                        </span>
                        <span className="text-xs text-slate-400">
                          {new Date(bill.purchaseDate).toLocaleDateString()}
                        </span>
                      </td>

                      {/* Dealer */}
                      <td className="px-4 py-4">
                        <span className="font-semibold text-slate-800 block">
                          {bill.supplier?.name || 'Unknown'}
                        </span>
                        <span className="text-xs text-slate-400">{bill.supplier?.phone}</span>
                      </td>

                      {/* Items */}
                      <td className="px-4 py-4 text-xs text-slate-600">
                        {bill.items.length} item(s) •{' '}
                        {bill.items.map((i) => i.item?.name).filter(Boolean).slice(0, 2).join(', ')}
                        {bill.items.length > 2 ? '...' : ''}
                      </td>

                      {/* Total Amount */}
                      <td className="px-4 py-4 font-bold text-slate-900">
                        ₹{bill.totalAmount.toLocaleString()}
                      </td>

                      {/* Paid */}
                      <td className="px-4 py-4 font-semibold text-emerald-600 text-xs">
                        ₹{bill.paidAmount.toLocaleString()}
                      </td>

                      {/* Balance */}
                      <td className="px-4 py-4 font-bold text-amber-700 text-xs">
                        ₹{bill.balanceAmount.toLocaleString()}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            isUnpaid
                              ? 'bg-rose-100 text-rose-700'
                              : isPartial
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {bill.paymentStatus}
                        </span>
                      </td>

                      {/* Action Buttons */}
                      <td className="px-6 py-4 text-right">
                        {isManager && (
                          <button
                            onClick={() => handleDeletePurchase(bill)}
                            title="Delete / Void wrong bill"
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition"
                          >
                            <Trash2 className="h-4 w-4" />
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

      {/* MODAL: Record New Purchase Bill */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Record Dealer Purchase Bill</h3>
                <p className="text-xs text-slate-500">Inventory will be automatically restocked</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 my-3 rounded-lg bg-red-50 text-red-700 text-xs border border-red-200">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreatePurchase} className="mt-4 space-y-5 text-xs font-semibold uppercase text-slate-600 tracking-wider">
              {/* Top Row: Dealer, Bill #, Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block mb-1">Select Dealer *</label>
                  <select
                    required
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 normal-case font-normal text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  >
                    <option value="">Select a dealer</option>
                    {suppliers.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name} (Due: ₹{s.balanceDue})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block mb-1">Invoice / Bill # *</label>
                  <input
                    type="text"
                    required
                    value={billNumber}
                    onChange={(e) => setBillNumber(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono normal-case font-normal text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="block mb-1">Bill Date *</label>
                  <input
                    type="date"
                    required
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 normal-case font-normal text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  />
                </div>
              </div>

              {/* Items Section */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase">Items Purchased</span>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 normal-case"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                {billItems.map((row, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-5">
                      <select
                        required
                        value={row.item}
                        onChange={(e) => handleItemChange(index, 'item', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs normal-case font-normal text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                      >
                        <option value="">Select Product</option>
                        {itemsList.map((i) => (
                          <option key={i._id} value={i._id}>
                            {i.name} ({i.sku})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-2">
                      <input
                        type="number"
                        min="1"
                        required
                        placeholder="Qty"
                        value={row.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-center normal-case font-normal text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                      />
                    </div>

                    <div className="col-span-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        placeholder="Cost (₹)"
                        value={row.unitCost}
                        onChange={(e) => handleItemChange(index, 'unitCost', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-center normal-case font-normal text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                      />
                    </div>

                    <div className="col-span-2 text-right font-bold text-slate-900 normal-case text-xs">
                      ₹{(row.total || 0).toLocaleString()}
                    </div>

                    <div className="col-span-1 text-center">
                      <button
                        type="button"
                        onClick={() => removeItemRow(index)}
                        disabled={billItems.length === 1}
                        className="text-slate-400 hover:text-rose-600 disabled:opacity-20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}

                <div className="pt-3 border-t border-slate-200 flex justify-between items-center text-sm font-bold text-slate-900 normal-case">
                  <span>Total Invoice Amount:</span>
                  <span className="text-base text-indigo-700">₹{totalBillAmount.toLocaleString()}</span>
                </div>
              </div>

              {/* Payment Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-indigo-50/40 border border-indigo-100">
                <div>
                  <label className="block mb-1 text-indigo-950">Amount Paid Upfront (₹)</label>
                  <input
                    type="number"
                    min="0"
                    max={totalBillAmount}
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    className="w-full rounded-lg border border-indigo-200 px-3 py-2 font-bold text-slate-900 normal-case focus:outline-none focus:ring-1 focus:ring-indigo-600 bg-white"
                  />
                  <p className="text-[11px] font-normal normal-case text-indigo-900 mt-1">
                    Balance of ₹{Math.max(0, totalBillAmount - (Number(paidAmount) || 0)).toLocaleString()} will be added to dealer's debt.
                  </p>
                </div>

                <div>
                  <label className="block mb-1 text-indigo-950">Payment Mode</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 normal-case font-normal text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  >
                    <option value="CREDIT">Full Credit (Pay Later)</option>
                    <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                    <option value="CASH">Cash</option>
                    <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block mb-1">Notes / Remarks</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Received in 3 cartons, verified by store keeper"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs normal-case font-normal text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 normal-case"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition normal-case"
                >
                  Save &amp; Restock Inventory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Purchases;