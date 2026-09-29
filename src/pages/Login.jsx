import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const DEMO_ACCOUNTS =
  import.meta.env.VITE_HIDE_DEMO_LOGINS === 'true'
    ? []
    : [
        { username: 'owner', label: 'Owner (Super Admin)', password: import.meta.env.VITE_OWNER_PASSWORD || 'ChangeMe123!' },
        { username: 'sales', label: 'Sales' },
        { username: 'production', label: 'Production' },
        { username: 'inventory', label: 'Inventory' },
        { username: 'rolling', label: 'Rolling' },
        { username: 'printing', label: 'Printing' },
        { username: 'cutting', label: 'Cutting' },
        { username: 'dispatch', label: 'Dispatch' },
        { username: 'accounts', label: 'Accounts' },
      ];
const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD || 'Demo@1234';

export function Login() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = typeof location.state?.from === 'string' && location.state.from.startsWith('/') ? location.state.from : '/';
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) {
    return <Navigate to={from} replace />;
  }

  function fillDemo(account) {
    setUsername(account.username);
    setPassword(account.password || DEMO_PASSWORD);
    setError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(username, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-4 py-8">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-xl border border-line bg-card p-8 shadow-lg"
      >
        <p className="text-xs uppercase tracking-[0.25em] text-accent">Sinopec</p>
        <h1 className="mt-2 text-xl font-semibold text-ink">Sign in</h1>
        <p className="mt-1 text-sm text-slate">Use your username and password.</p>

        <label className="mt-6 block text-base font-semibold text-ink">
          Username
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-ink outline-none focus:border-accent"
          />
        </label>

        <label className="mt-4 block text-base font-semibold text-ink">
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-ink outline-none focus:border-accent"
          />
        </label>

        {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}

        <button
          type="submit"
          disabled={submitting}
          className="mt-6 w-full rounded-lg bg-accent px-4 py-2.5 font-semibold text-white hover:bg-accent-dark disabled:opacity-60"
        >
          {submitting ? 'Signing in...' : 'Sign in'}
        </button>

        {DEMO_ACCOUNTS.length ? (
        <div className="mt-6">
          <p className="text-xs font-medium text-ink">Demo accounts — click to fill</p>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.username}
                type="button"
                onClick={() => fillDemo(account)}
                className={`rounded-lg border px-2.5 py-1.5 text-left text-xs hover:border-accent hover:text-ink ${
                  username === account.username ? 'border-accent bg-amber-50 text-ink' : 'border-line bg-paper text-slate'
                }`}
              >
                <span className="block font-semibold text-ink">{account.label}</span>
                <span className="block">ID: {account.username}</span>
                {account.password ? <span className="block">Password: {account.password}</span> : null}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate">
            Password for the other demo accounts: <span className="font-semibold text-ink">{DEMO_PASSWORD}</span>
          </p>
        </div>
        ) : null}
      </form>
    </div>
  );
}
