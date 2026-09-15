import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { permissionsApi } from '../api/permissions.api';
import { rolesApi } from '../api/roles.api';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { SearchField } from '../components/ui/SearchField';
import { Tabs } from '../components/ui/Tabs';
import { usePermission } from '../hooks/usePermission';

const MODULE_TABS = [
  { id: 'all', label: 'All' },
  { id: 'access', label: 'Access' },
  { id: 'sales', label: 'Sales' },
  { id: 'production', label: 'Production' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'dispatch', label: 'Dispatch' },
  { id: 'accounts', label: 'Accounts' },
];

const MODULE_LABELS = {
  access: 'Access',
  sales: 'Sales',
  production: 'Production',
  inventory: 'Inventory',
  dispatch: 'Dispatch',
  accounts: 'Accounts',
};

function parentModule(moduleName) {
  if (['users', 'roles', 'permissions'].includes(moduleName)) return 'access';
  if (String(moduleName).startsWith('production')) return 'production';
  return moduleName;
}

export function RoleDetail() {
  const { id } = useParams();
  const { can } = usePermission();
  const canEdit = can('roles:update');
  const [role, setRole] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [assigned, setAssigned] = useState([]);
  const [moduleTab, setModuleTab] = useState('all');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    const requests = [rolesApi.list()];
    if (can('permissions:read') || canEdit) {
      requests.push(permissionsApi.list());
    }
    const [roles, nextPermissions = []] = await Promise.all(requests);
    const nextRole = roles.find((item) => item._id === id);
    if (!nextRole) {
      setError('Role not found.');
      setRole(null);
      return;
    }
    setRole(nextRole);
    setPermissions(nextPermissions);
    setAssigned((nextRole.permissions || []).map((permission) => permission._id));
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, [id]);

  const locked = role?.slug === 'super_admin';

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return permissions.filter((permission) => {
      if (moduleTab !== 'all' && parentModule(permission.module) !== moduleTab) return false;
      if (!q) return true;
      return [permission.key, permission.description].some((value) => value?.toLowerCase().includes(q));
    });
  }, [permissions, moduleTab, query]);

  const grouped = useMemo(() => {
    return filtered.reduce((groups, permission) => {
      const key = parentModule(permission.module);
      if (!groups[key]) groups[key] = [];
      groups[key].push(permission);
      return groups;
    }, {});
  }, [filtered]);

  function toggle(permissionId) {
    setAssigned((current) =>
      current.includes(permissionId) ? current.filter((item) => item !== permissionId) : [...current, permissionId]
    );
  }

  function setVisible(enabled) {
    const visibleIds = filtered.map((permission) => permission._id);
    setAssigned((current) => {
      if (enabled) return [...new Set([...current, ...visibleIds])];
      return current.filter((item) => !visibleIds.includes(item));
    });
  }

  async function save() {
    if (!role || locked) return;
    setError('');
    setNotice('');
    setSaving(true);
    try {
      const updated = await rolesApi.updatePermissions(role._id, assigned);
      setRole(updated);
      setAssigned((updated.permissions || []).map((permission) => permission._id));
      setNotice('Permissions saved.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!role && !error) {
    return <p className="text-sm text-slate">Loading...</p>;
  }

  if (!role) {
    return (
      <div className="space-y-3">
        <PageHeader title="Role" backTo="/roles" backLabel="Roles" />
        <p className="text-sm text-red-700">{error}</p>
      </div>
    );
  }

  const assignedCount = locked ? permissions.length || 'All' : assigned.length;

  return (
    <div className="space-y-5">
      <PageHeader
        title={role.name}
        subtitle={role.description}
        backTo="/roles"
        backLabel="Roles"
        search={!locked ? <SearchField value={query} onChange={setQuery} placeholder="Search permissions" /> : null}
        actions={
          canEdit && !locked ? (
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-dark disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save permissions'}
            </button>
          ) : null
        }
        extra={!locked ? <Tabs tabs={MODULE_TABS} value={moduleTab} onChange={setModuleTab} /> : null}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-line bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-steel">Type</p>
          <p className="mt-1 font-medium">{role.slug.replaceAll('_', ' ')}</p>
        </div>
        <div className="rounded-xl border border-line bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-steel">Assigned keys</p>
          <p className="mt-1 font-medium">{assignedCount}</p>
        </div>
        <div className="rounded-xl border border-line bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-steel">Access</p>
          <p className="mt-1 font-medium">{locked ? 'Full access' : canEdit ? 'Editable' : 'View only'}</p>
        </div>
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {notice ? <p className="text-sm text-emerald-700">{notice}</p> : null}

      {locked ? (
        <section className="rounded-xl border border-line bg-card p-5">
          <p className="text-sm text-slate">
            Super Admin always has every permission. There is nothing to configure on this role.{' '}
            <Link to="/roles" className="underline">
              Back to roles
            </Link>
          </p>
        </section>
      ) : (
        <section className="rounded-xl border border-line bg-card p-5">
          {canEdit && permissions.length ? (
            <div className="mt-3 flex gap-2 text-sm">
              <button type="button" onClick={() => setVisible(true)} className="rounded-md border border-line px-2.5 py-1 hover:bg-paper">
                Select visible
              </button>
              <button type="button" onClick={() => setVisible(false)} className="rounded-md border border-line px-2.5 py-1 hover:bg-paper">
                Clear visible
              </button>
            </div>
          ) : null}

          {filtered.length === 0 ? (
            <EmptyState title="No permissions match" hint="Clear search or pick another module." />
          ) : canEdit && permissions.length ? (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {Object.entries(grouped).map(([moduleName, items]) => (
                <div key={moduleName} className="rounded-lg border border-line p-3">
                  <p className="mb-2 text-xs uppercase tracking-wide text-steel">{MODULE_LABELS[moduleName] || moduleName}</p>
                  <div className="space-y-1.5">
                    {items.map((permission) => (
                      <label key={permission._id} className="flex cursor-pointer items-start gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={assigned.includes(permission._id)}
                          onChange={() => toggle(permission._id)}
                          className="mt-0.5"
                        />
                        <span>
                          <span className="font-medium">{permission.key}</span>
                          <span className="block text-xs text-steel">{permission.description}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2">
              {(role.permissions || []).map((permission) => (
                <span key={permission._id} className="rounded-full bg-paper px-2.5 py-1 text-xs text-slate">
                  {permission.key}
                </span>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
