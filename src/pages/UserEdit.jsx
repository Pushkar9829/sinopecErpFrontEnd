import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { rolesApi } from '../api/roles.api';
import { usersApi } from '../api/users.api';
import { PermissionGate } from '../components/PermissionGate';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusToggle } from '../components/ui/StatusToggle';
import { useAuth } from '../context/AuthContext';
import { usePermission } from '../hooks/usePermission';

const inputClass = 'mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 outline-none focus:border-accent disabled:bg-paper';

export function UserEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
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
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this user?')) return;
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
        <PageHeader title="User" backTo="/users" backLabel="Users" />
        <p className="text-sm text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader title={form.fullName} subtitle={`@${form.username}`} backTo="/users" backLabel="Users" />

      <form onSubmit={handleSubmit} className="max-w-xl space-y-4 rounded-xl border border-line bg-card p-5">
        <label className="block text-sm text-slate">
          Full name
          <input
            required
            disabled={!canEdit}
            value={form.fullName}
            onChange={(event) => update('fullName', event.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block text-sm text-slate">
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
          <label className="block text-sm text-slate">
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
        <label className="block text-sm text-slate">
          Role
          <select
            required
            disabled={!canEdit}
            value={form.roleId}
            onChange={(event) => update('roleId', event.target.value)}
            className={inputClass}
          >
            {roles.map((role) => (
              <option key={role._id} value={role._id}>
                {role.name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center justify-between rounded-lg border border-line px-3 py-2">
          <span className="text-sm text-slate">Account status</span>
          <StatusToggle checked={form.isActive} disabled={!canEdit} onChange={(isActive) => update('isActive', isActive)} />
        </div>

        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        {notice ? <p className="text-sm text-emerald-700">{notice}</p> : null}

        <div className="flex flex-wrap gap-2">
          {canEdit ? (
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-accent px-4 py-2 font-medium text-white hover:bg-accent-dark disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          ) : null}
          <button type="button" onClick={() => navigate('/users')} className="rounded-lg border border-line px-4 py-2">
            Back to list
          </button>
          <PermissionGate permission="users:delete">
            <button
              type="button"
              disabled={id === currentUser?.id}
              onClick={handleDelete}
              className="ml-auto rounded-lg px-4 py-2 text-red-700 hover:underline disabled:opacity-40"
            >
              Delete user
            </button>
          </PermissionGate>
        </div>
      </form>
    </div>
  );
}
