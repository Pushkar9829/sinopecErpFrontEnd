import { confirmAction } from '../components/ui/ConfirmHost';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { rolesApi } from '../api/roles.api';
import { usersApi } from '../api/users.api';
import { PermissionGate } from '../components/PermissionGate';
import { BackButton } from '../components/ui/BackButton';
import { RoleMenu } from '../components/ui/RoleMenu';
import { StatusToggle } from '../components/ui/StatusToggle';
import { useAuth } from '../context/AuthContext';
import { usePermission } from '../hooks/usePermission';

const inputClass = 'mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 outline-none focus:border-accent disabled:bg-paper';

function FormBar({ title, extra }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-card px-3 py-2">
      <BackButton fallback="/users" />
      <h1 className="px-1 text-lg font-semibold">{title}</h1>
      {extra ? <span className="text-sm text-slate">{extra}</span> : null}
    </div>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M4 6h12" strokeLinecap="round" />
      <path d="M8 6V4h4v2" />
      <path d="M6 6l.7 10h6.6L14 6" strokeLinejoin="round" />
      <path d="M8.5 9v5M11.5 9v5" strokeLinecap="round" />
    </svg>
  );
}

export function UserEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, refreshUser } = useAuth();
  const { can } = usePermission();
  const canEdit = can('users:update');
  const [roles, setRoles] = useState([]);
  const [form, setForm] = useState(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([usersApi.list(), rolesApi.list().catch(() => [])])
      .then(([users, nextRoles]) => {
        const user = users.find((item) => item.id === id);
        if (!user) {
          setError('User not found.');
          return;
        }
        setRoles(nextRoles);
        setForm({
          fullName: user.fullName,
          username: user.username,
          roleId: user.role?.id || '',
          isActive: user.isActive,
        });
      })
      .catch((err) => setError(err.message));
  }, [id]);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!canEdit) return;
    setError('');
    setNotice('');
    setSaving(true);
    try {
      const payload = { ...form };
      if (password.trim()) payload.password = password.trim();
      await usersApi.update(id, payload);
      setPassword('');
      setNotice('Saved.');
      if (currentUser?.id === id) await refreshUser().catch(() => {});
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!(await confirmAction({ message: 'Delete this user?', confirmLabel: 'Delete', danger: true }))) return;
    try {
      await usersApi.remove(id);
      navigate('/users');
    } catch (err) {
      setError(err.message);
    }
  }

  if (!form && !error) {
    return <p className="text-sm text-slate">Loading...</p>;
  }

  if (!form) {
    return (
      <div className="space-y-3">
        <FormBar title="User" />
        <p className="text-sm text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <FormBar title={form.fullName} extra={`@${form.username}`} />

      <form onSubmit={handleSubmit} className="max-w-xl space-y-4 rounded-xl border border-line bg-card p-5">
        <label className="block text-base font-semibold text-ink">
          Full name
          <input
            required
            disabled={!canEdit}
            value={form.fullName}
            onChange={(event) => update('fullName', event.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block text-base font-semibold text-ink">
          Username
          <input
            required
            disabled={!canEdit}
            value={form.username}
            onChange={(event) => update('username', event.target.value)}
            className={inputClass}
          />
        </label>
        {canEdit ? (
          <label className="block text-base font-semibold text-ink">
            New password
            <input
              type="password"
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Leave blank to keep current password"
              className={inputClass}
            />
          </label>
        ) : null}
        <label className="block text-base font-semibold text-ink">
          Role
          <RoleMenu roles={roles} value={form.roleId} disabled={!canEdit || id === currentUser?.id} onChange={(roleId) => update('roleId', roleId)} />
        </label>
        <div className="flex items-center justify-between rounded-lg border border-line px-3 py-2">
          <span className="text-base font-semibold text-ink">Account status</span>
          <StatusToggle checked={form.isActive} disabled={!canEdit || id === currentUser?.id} onChange={(isActive) => update('isActive', isActive)} />
        </div>

        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        {notice ? <p className="text-sm text-emerald-700">{notice}</p> : null}

        <div className="flex flex-wrap gap-2">
          {canEdit ? (
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-accent px-4 py-2 font-semibold text-white hover:bg-accent-dark disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          ) : null}
          <BackButton fallback="/users" label="Back to list" />
          <PermissionGate permission="users:delete">
            <button
              type="button"
              title="Delete user"
              aria-label="Delete user"
              disabled={id === currentUser?.id}
              onClick={handleDelete}
              className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-white text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <TrashIcon />
            </button>
          </PermissionGate>
        </div>
      </form>
    </div>
  );
}
