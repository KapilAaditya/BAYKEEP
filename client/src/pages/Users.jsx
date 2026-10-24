import { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import {
  CheckCircle2,
  XCircle,
  Trash2,
  RefreshCw,
  AlertCircle,
  Clock,
} from 'lucide-react';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ message: '', type: '' });
  const { user: currentUser } = useAuth();

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/auth/users');
      setUsers(res.data.data);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId, newRole) => {
    setFeedback({ message: '', type: '' });
    try {
      await api.patch(`/auth/users/${userId}/role`, { role: newRole });
      setFeedback({ message: 'User role updated successfully', type: 'success' });
      fetchUsers();
    } catch (err) {
      setFeedback({
        message: err.response?.data?.message || 'Failed to update user role',
        type: 'error',
      });
    }
  };

  const handleApproveToggle = async (userId, approveState) => {
    setFeedback({ message: '', type: '' });
    try {
      const res = await api.patch(`/auth/users/${userId}/approve`, {
        isApproved: approveState,
      });
      setFeedback({ message: res.data.message, type: 'success' });
      fetchUsers();
    } catch (err) {
      setFeedback({
        message: err.response?.data?.message || 'Failed to update approval status',
        type: 'error',
      });
    }
  };

  const handleDeleteUser = async (u) => {
    if (!window.confirm(`Remove ${u.name} (${u.email}) from your workspace?`)) return;
    setFeedback({ message: '', type: '' });
    try {
      await api.delete(`/auth/users/${u._id}`);
      setFeedback({ message: `${u.name} removed from workspace`, type: 'success' });
      fetchUsers();
    } catch (err) {
      setFeedback({
        message: err.response?.data?.message || 'Failed to remove user',
        type: 'error',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Workspace User Access</h1>
          <p className="text-sm text-slate-500 mt-1">
            Staff members can join by entering your Admin email (<span className="font-mono font-semibold text-slate-700">{currentUser?.email}</span>) and must be approved here before signing in.
          </p>
        </div>
      </div>

      {feedback.message && (
        <div
          className={`p-3.5 rounded-lg text-xs font-semibold flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{feedback.message}</span>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">User</th>
                <th className="px-4 py-4">Email</th>
                <th className="px-4 py-4">Approval Status</th>
                <th className="px-4 py-4">Role</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-400">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto text-indigo-600" />
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isSelf = u._id === currentUser?._id;
                  return (
                    <tr
                      key={u._id}
                      className={`transition ${
                        !u.isApproved ? 'bg-amber-50/60 hover:bg-amber-50' : 'hover:bg-slate-50/60'
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">{u.name}</span>
                          {isSelf && (
                            <span className="text-[10px] uppercase font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">
                              Admin (You)
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-4 text-slate-600 text-xs font-mono">{u.email}</td>

                      <td className="px-4 py-4">
                        {u.isApproved ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Authorized</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                            <Clock className="h-3.5 w-3.5" />
                            <span>Pending Approval</span>
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        {isSelf ? (
                          <span className="text-xs font-bold uppercase text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
                            {u.role}
                          </span>
                        ) : (
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u._id, e.target.value)}
                            className="text-xs rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                          >
                            <option value="staff">Staff</option>
                            <option value="manager">Manager</option>
                            <option value="admin">Admin</option>
                          </select>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                        {!isSelf && (
                          <>
                            {!u.isApproved ? (
                              <button
                                onClick={() => handleApproveToggle(u._id, true)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>Approve</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleApproveToggle(u._id, false)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 text-xs font-semibold hover:bg-amber-100 transition"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                <span>Suspend</span>
                              </button>
                            )}

                            <button
                              onClick={() => handleDeleteUser(u)}
                              title="Remove User"
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
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
    </div>
  );
};

export default Users;