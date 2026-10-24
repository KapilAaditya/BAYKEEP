import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BaykeepIcon } from '../components/Logo';
import { UserPlus, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('admin');
  const [adminEmail, setAdminEmail] = useState('');
  const [error, setError] = useState('');
  const [pendingMessage, setPendingMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setPendingMessage('');
    setLoading(true);

    try {
      const result = await register(name, email, password, role, adminEmail);
      if (result?.pendingApproval) {
        setPendingMessage(result.message);
      } else {
        navigate('/');
      }
    } catch (err) {
      const errorMsg =
        err.response?.data?.errors?.[0]?.message ||
        err.response?.data?.message ||
        'Registration failed. Please try again.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8">
        <div className="text-center mb-6">
          <div className="inline-flex h-12 w-12 items-center justify-center mb-3">
            <BaykeepIcon className="h-12 w-12" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Create Baykeep Account</h2>
          <p className="text-sm text-slate-500 mt-1">
            {role === 'admin'
              ? 'Start a new independent business workspace'
              : 'Request to join your Admin workspace'}
          </p>
        </div>

        {pendingMessage ? (
          <div className="space-y-5 text-center py-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <Clock className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-bold text-slate-900">Waiting for Admin Approval</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{pendingMessage}</p>
            </div>
            <Link
              to="/login"
              className="inline-flex w-full items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition"
            >
              Return to Sign In
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-6 flex items-center gap-2.5 rounded-lg bg-red-50 p-3.5 text-sm text-red-700 border border-red-200/80">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                <p>{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Account Type
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 transition"
                >
                  <option value="admin">Admin (Create New Independent Workspace)</option>
                  <option value="manager">Manager (Join Existing Admin Workspace)</option>
                  <option value="staff">Staff (Join Existing Admin Workspace)</option>
                </select>
              </div>

              {role !== 'admin' && (
                <div className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-200/80">
                  <label className="block text-xs font-bold uppercase tracking-wider text-indigo-950 mb-1.5">
                    Your Admin's Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="admin@company.com"
                    className="w-full rounded-lg border border-indigo-200 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  />
                  <p className="text-[11px] text-indigo-800 mt-1.5">
                    Your account will remain locked until this Admin authorizes you.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Your Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@baykeep.com"
                  className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 transition"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-600/40 disabled:opacity-50 transition"
              >
                <UserPlus className="h-4 w-4" />
                <span>
                  {loading
                    ? 'Submitting...'
                    : role === 'admin'
                    ? 'Create Admin Workspace'
                    : 'Request Staff Access'}
                </span>
              </button>
            </form>

            <p className="mt-8 text-center text-xs text-slate-500">
              Already registered?{' '}
              <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-700">
                Sign In
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default Register;