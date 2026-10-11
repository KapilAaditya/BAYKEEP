import { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import {
  Users2,
  Search,
  Plus,
  CreditCard,
  Phone,
  Mail,
  MapPin,
  History,
  X,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';

const Suppliers = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal States
  const [isAddSupplierModalOpen, setIsAddSupplierModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [supplierHistory, setSupplierHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  // New Supplier Form
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
  });

  // Record Payment Form
  const [paymentForm, setPaymentForm] = useState({
    amountPaid: '',
    paymentMethod: 'UPI',
    transactionReference: '',
    notes: '',
  });

  const [formError, setFormError] = useState('');
  const { isManager } = useAuth();

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const [suppliersRes, summaryRes] = await Promise.all([
        api.get('/suppliers', { params: { search } }),
        api.get('/suppliers/summary'),
      ]);
      setSuppliers(suppliersRes.data.data);
      setSummary(summaryRes.data.data);
    } catch (err) {
      console.error('Failed to load suppliers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [search]);

  // Load specific dealer's payment ledger
  const openHistoryModal = async (supplier) => {
    setSelectedSupplier(supplier);
    setIsHistoryModalOpen(true);
    setHistoryLoading(true);
    try {
      const res = await api.get(`/supplier-payments/supplier/${supplier._id}`);
      setSupplierHistory(res.data.data);
    } catch (err) {
      console.error('Failed to load payment history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Open Record Payment Modal
  const openPaymentModal = (supplier) => {
    setSelectedSupplier(supplier);
    setPaymentForm({
      amountPaid: '',
      paymentMethod: 'UPI',
      transactionReference: '',
      notes: '',
    });
    setFormError('');
    setIsPaymentModalOpen(true);
  };

  // Submit New Supplier
  const handleCreateSupplier = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      await api.post('/suppliers', supplierForm);
      setIsAddSupplierModalOpen(false);
      setSupplierForm({ name: '', contactPerson: '', phone: '', email: '', address: '', notes: '' });
      fetchSuppliers();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to create dealer');
    }
  };

  // Submit Payment Installment
  const handleRecordPayment = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      await api.post('/supplier-payments', {
        supplier: selectedSupplier._id,
        amountPaid: Number(paymentForm.amountPaid),
        paymentMethod: paymentForm.paymentMethod,
        transactionReference: paymentForm.transactionReference,
        notes: paymentForm.notes,
      });
      setIsPaymentModalOpen(false);
      fetchSuppliers();
      // If history is currently open, refresh it as well
      if (isHistoryModalOpen) {
        openHistoryModal(selectedSupplier);
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to record payment');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dealers & Ledger</h1>
          <p className="text-sm text-slate-500 mt-1">
            Track suppliers, outstanding debts, and installment payment history
          </p>
        </div>
        {isManager && (
          <button
            onClick={() => {
              setFormError('');
              setIsAddSupplierModalOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
          >
            <Plus className="h-4 w-4" />
            <span>Add New Dealer</span>
          </button>
        )}
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Billed</span>
          <h3 className="text-2xl font-bold text-slate-900 mt-2">
            ₹{(summary?.totalBilled || 0).toLocaleString()}
          </h3>
          <p className="text-xs text-slate-500 mt-1">Cumulative goods purchased</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-emerald-200/80 bg-emerald-50/20 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Total Paid</span>
          <h3 className="text-2xl font-bold text-emerald-900 mt-2">
            ₹{(summary?.totalPaid || 0).toLocaleString()}
          </h3>
          <p className="text-xs text-emerald-600 mt-1">Cleared across all installments</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-rose-200/80 bg-rose-50/20 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-rose-700">Total Money Owed</span>
          <h3 className="text-2xl font-bold text-rose-700 mt-2">
            ₹{(summary?.totalOwed || 0).toLocaleString()}
          </h3>
          <p className="text-xs text-rose-600 mt-1">Outstanding balance to be paid</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
        <div className="relative">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search dealer by company name, contact person, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:border-indigo-600 placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Dealers Cards Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto text-indigo-600" />
        </div>
      ) : suppliers.length === 0 ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
          No dealers registered yet. Click "Add New Dealer" to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {suppliers.map((dealer) => {
            const hasDebt = dealer.balanceDue > 0;
            return (
              <div
                key={dealer._id}
                className={`bg-white rounded-xl p-5 border transition-all shadow-xs flex flex-col justify-between ${
                  hasDebt ? 'border-amber-200 hover:border-amber-300' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{dealer.name}</h3>
                      {dealer.contactPerson && (
                        <p className="text-xs text-slate-500 font-medium">{dealer.contactPerson}</p>
                      )}
                    </div>
                    {hasDebt ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-amber-100 text-amber-800">
                        Owed
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-100 text-emerald-800">
                        All Cleared
                      </span>
                    )}
                  </div>

                  {/* Contact Info */}
                  <div className="mt-3 space-y-1 text-xs text-slate-600">
                    <p className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      <span>{dealer.phone}</span>
                    </p>
                    {dealer.email && (
                      <p className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-slate-400" />
                        <span className="truncate">{dealer.email}</span>
                      </p>
                    )}
                    {dealer.address && (
                      <p className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                        <span className="truncate">{dealer.address}</span>
                      </p>
                    )}
                  </div>

                  {/* Balance Display */}
                  <div className="mt-5 p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-semibold uppercase text-slate-400 block">Balance Owed</span>
                      <span className={`text-lg font-bold ${hasDebt ? 'text-amber-800' : 'text-slate-800'}`}>
                        ₹{dealer.balanceDue.toLocaleString()}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] font-semibold uppercase text-slate-400 block">Total Paid</span>
                      <span className="text-xs font-bold text-emerald-600">
                        ₹{dealer.totalPaid.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => openHistoryModal(dealer)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    <History className="h-3.5 w-3.5 text-slate-500" />
                    <span>View Ledger</span>
                  </button>

                  {isManager && hasDebt && (
                    <button
                      onClick={() => openPaymentModal(dealer)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-indigo-600 text-xs font-semibold text-white hover:bg-indigo-700 transition"
                    >
                      <CreditCard className="h-3.5 w-3.5" />
                      <span>Pay Money</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: Payment Ledger / Installment History */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{selectedSupplier?.name}</h3>
                <p className="text-xs text-slate-500">Payment Installment Ledger & Khata</p>
              </div>
              <button onClick={() => setIsHistoryModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {historyLoading ? (
              <div className="p-12 text-center">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto text-indigo-600" />
              </div>
            ) : supplierHistory ? (
              <div className="mt-5 space-y-6">
                {/* Balance & Installments Summary */}
                <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-center">
                  <div>
                    <span className="text-[11px] font-semibold uppercase text-slate-400 block">Remaining Due</span>
                    <span className="text-lg font-bold text-rose-600">
                      ₹{supplierHistory.balanceDue.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold uppercase text-slate-400 block">Total Paid So Far</span>
                    <span className="text-lg font-bold text-emerald-600">
                      ₹{supplierHistory.totalPaid.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold uppercase text-slate-400 block">Payments Count</span>
                    <span className="text-lg font-bold text-indigo-600">
                      {supplierHistory.timesPaidCount} {supplierHistory.timesPaidCount === 1 ? 'time' : 'times'}
                    </span>
                  </div>
                </div>

                {/* Ledger Table */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Installments History
                    </h4>
                    {isManager && supplierHistory.balanceDue > 0 && (
                      <button
                        onClick={() => openPaymentModal(selectedSupplier)}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                      >
                        + Pay Another Installment
                      </button>
                    )}
                  </div>

                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600 uppercase">
                        <tr>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Amount</th>
                          <th className="px-4 py-3">Method</th>
                          <th className="px-4 py-3">Reference / Notes</th>
                          <th className="px-4 py-3 text-right">Recorded By</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {supplierHistory.paymentLedger.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="p-6 text-center text-slate-400">
                              No payments recorded yet for this dealer.
                            </td>
                          </tr>
                        ) : (
                          supplierHistory.paymentLedger.map((p) => (
                            <tr key={p._id} className="hover:bg-slate-50/50">
                              <td className="px-4 py-3 font-medium text-slate-800">
                                {new Date(p.paymentDate).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-3 font-bold text-emerald-700">
                                ₹{p.amountPaid.toLocaleString()}
                              </td>
                              <td className="px-4 py-3">
                                <span className="inline-block px-2 py-0.5 rounded bg-slate-100 font-mono text-[11px]">
                                  {p.paymentMethod}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-slate-500">
                                {p.transactionReference && (
                                  <span className="font-mono text-slate-700 block font-semibold">
                                    Ref: {p.transactionReference}
                                  </span>
                                )}
                                {p.notes || '—'}
                              </td>
                              <td className="px-4 py-3 text-right text-slate-500">
                                {p.recordedBy?.name || 'Staff'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* MODAL 2: Record Installment Payment */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                Pay Dealer: {selectedSupplier?.name}
              </h3>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3 my-3 rounded-lg bg-amber-50 border border-amber-200/80 text-xs">
              <span className="text-amber-800 font-medium">Current Balance Owed:</span>
              <span className="font-bold text-amber-900 text-sm ml-2">
                ₹{selectedSupplier?.balanceDue.toLocaleString()}
              </span>
            </div>

            {formError && (
              <div className="p-3 mb-3 rounded-lg bg-red-50 text-red-700 text-xs border border-red-200">
                {formError}
              </div>
            )}

            <form onSubmit={handleRecordPayment} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                  Amount Paying Now (₹) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max={selectedSupplier?.balanceDue}
                  value={paymentForm.amountPaid}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amountPaid: e.target.value })}
                  placeholder="Enter amount..."
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-600 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                >
                  <option value="UPI">UPI (Google Pay, PhonePe, Paytm)</option>
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS/IMPS)</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                  Transaction Reference / UTR / Cheque #
                </label>
                <input
                  type="text"
                  value={paymentForm.transactionReference}
                  onChange={(e) => setPaymentForm({ ...paymentForm, transactionReference: e.target.value })}
                  placeholder="e.g. UTR102948201 or Cheque 00412"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                  Notes / Remark
                </label>
                <input
                  type="text"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  placeholder="e.g. Cleared 2nd installment for August order"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-3.5 py-2 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition"
                >
                  Submit Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Add New Dealer */}
      {isAddSupplierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Add New Dealer</h3>
              <button onClick={() => setIsAddSupplierModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 my-3 rounded-lg bg-red-50 text-red-700 text-xs border border-red-200">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSupplier} className="space-y-3 mt-3">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                  Dealer / Business Name *
                </label>
                <input
                  type="text"
                  required
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                  placeholder="e.g. Apex Electrical Supplies"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                  Contact Person
                </label>
                <input
                  type="text"
                  value={supplierForm.contactPerson}
                  onChange={(e) => setSupplierForm({ ...supplierForm, contactPerson: e.target.value })}
                  placeholder="e.g. Rajesh Kumar"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                  Phone Number *
                </label>
                <input
                  type="text"
                  required
                  value={supplierForm.phone}
                  onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                  placeholder="e.g. 9876543210"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  value={supplierForm.email}
                  onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                  placeholder="dealer@example.com"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                  Address / City
                </label>
                <input
                  type="text"
                  value={supplierForm.address}
                  onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
                  placeholder="e.g. Shop #12, Industrial Area"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddSupplierModalOpen(false)}
                  className="px-3.5 py-2 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition"
                >
                  Save Dealer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Suppliers;