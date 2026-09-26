import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { rolesApi } from '../api/roles.api';
import { usersApi } from '../api/users.api';
import { BackButton } from '../components/ui/BackButton';
import { RoleMenu } from '../components/ui/RoleMenu';
import { StatusToggle } from '../components/ui/StatusToggle';

const inputClass = 'mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 outline-none focus:border-accent';

function FormBar({ title }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-card px-3 py-2">
      <BackButton fallback="/users" />
      <h1 className="px-1 text-lg font-semibold">{title}</h1>
    </div>
  );
}

export function UserCreate() {
  const navigate = useNavigate();
  const [roles, setRoles] = useState([]);
  const [form, setForm] = useState({
    fullName: '',
    username: '',
    password: '',
    roleId: '',
    isActive: true,
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    rolesApi
      .list()
      .then((nextRoles) => {
        setRoles(nextRoles);
        setForm((prev) => ({ ...prev, roleId: prev.roleId || nextRoles[0]?._id || '' }));
      })
      .catch((err) => setError(err.message));
  }, []);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      await usersApi.create(form);
      navigate('/users');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <FormBar title="Add user" />

      <form onSubmit={handleSubmit} className="max-w-xl space-y-4 rounded-xl border border-line bg-card p-5">
        <label className="block text-base font-semibold text-ink">
          Full name
          <input required value={form.fullName} onChange={(event) => update('fullName', event.target.value)} className={inputClass} />
        </label>
        <label className="block text-base font-semibold text-ink">
          Username
          <input required value={form.username} onChange={(event) => update('username', event.target.value)} className={inputClass} />
        </label>
        <label className="block text-base font-semibold text-ink">
          Password
          <input
            required
            type="password"
            minLength={8}
            value={form.password}
            onChange={(event) => update('password', event.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block text-base font-semibold text-ink">
          Role
          <RoleMenu roles={roles} value={form.roleId} onChange={(roleId) => update('roleId', roleId)} />
        </label>
        <div className="flex items-center justify-between rounded-lg border border-line px-3 py-2">
          <span className="text-base font-semibold text-ink">Account status</span>
          <StatusToggle checked={form.isActive} onChange={(isActive) => update('isActive', isActive)} />
        </div>

        {error ? <p className="text-sm text-red-700">{error}</p> : null}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-accent px-4 py-2 font-semibold text-white hover:bg-accent-dark disabled:opacity-60"
          >
            {saving ? 'Creating...' : 'Create user'}
          </button>
          <BackButton fallback="/users" label="Cancel" />
        </div>
      </form>
    </div>
  );
}
