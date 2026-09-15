import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const DEMO_ACCOUNTS = [
  { username: 'owner', label: 'Owner' },
  { username: 'sales', label: 'Sales' },
  { username: 'production', label: 'Production' },
  { username: 'inventory', label: 'Inventory' },
  { username: 'rolling', label: 'Rolling' },
  { username: 'printing', label: 'Printing' },
  { username: 'cutting', label: 'Cutting' },
  { username: 'packing', label: 'Packing' },
  { username: 'dispatch', label: 'Dispatch' },
  { username: 'accounts', label: 'Accounts' },
];

export function Login() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) {
    return <Navigate to="/" replace />;
  }

  function fillDemo(name) {
    setUsername(name);
    setPassword(name === 'owner' ? 'ChangeMe123!' : 'Demo@1234');
    setError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(username, password);
      navigate('/', { replace: true });
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

        <label className="mt-6 block text-sm font-medium text-slate">
          Username
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-ink outline-none focus:border-accent"
          />
        </label>

        <label className="mt-4 block text-sm font-medium text-slate">
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
          className="mt-6 w-full rounded-lg bg-accent px-4 py-2.5 font-medium text-white hover:bg-accent-dark disabled:opacity-60"
        >
          {submitting ? 'Signing in...' : 'Sign in'}
        </button>

        <div className="mt-6">
          <p className="text-xs font-medium text-ink">Demo accounts</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.username}
                type="button"
                onClick={() => fillDemo(account.username)}
                className="rounded-full border border-line bg-paper px-2.5 py-1 text-xs text-slate hover:border-accent hover:text-ink"
              >
                {account.label}
              </button>
            ))}
          </div>
        </div>
      </form>
    </div>
  );
}
