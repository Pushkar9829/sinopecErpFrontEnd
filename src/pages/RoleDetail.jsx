import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { permissionsApi } from '../api/permissions.api';
import { rolesApi } from '../api/roles.api';
import { EmptyState } from '../components/ui/EmptyState';
import { BackButton } from '../components/ui/BackButton';
import { SearchField } from '../components/ui/SearchField';
import { usePermission } from '../hooks/usePermission';
import { useAuth } from '../context/AuthContext';

const MODULES = [
  { id: 'all', label: 'All', chip: 'border-slate-300 bg-slate-100 text-slate-700', dot: 'bg-slate-500' },
  { id: 'access', label: 'Access', chip: 'border-orange-300 bg-orange-100 text-orange-900', dot: 'bg-orange-600' },
  { id: 'sales', label: 'Sales', chip: 'border-sky-300 bg-sky-100 text-sky-800', dot: 'bg-sky-600' },
  { id: 'production', label: 'Production', chip: 'border-amber-300 bg-amber-100 text-amber-900', dot: 'bg-amber-500' },
  { id: 'inventory', label: 'Inventory', chip: 'border-emerald-300 bg-emerald-100 text-emerald-800', dot: 'bg-emerald-600' },
  { id: 'dispatch', label: 'Dispatch', chip: 'border-teal-300 bg-teal-100 text-teal-800', dot: 'bg-teal-600' },
  { id: 'accounts', label: 'Accounts', chip: 'border-violet-300 bg-violet-100 text-violet-800', dot: 'bg-violet-600' },
];

function parentModule(moduleName) {
  if (['users', 'roles', 'permissions'].includes(moduleName)) return 'access';
  if (String(moduleName).startsWith('production')) return 'production';
  return moduleName;
}

function moduleMeta(id) {
  return MODULES.find((item) => item.id === id) || MODULES[0];
}

function ModuleMenu({ value, counts, onChange }) {
  const [open, setOpen] = useState(false);
  const current = moduleMeta(value);

  useEffect(() => {
    if (!open) return undefined;
    function close() {
      setOpen(false);
    }
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [open]);

  return (
    <div className="relative" onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        aria-label="Module"
        aria-expanded={open}
        onClick={() => setOpen((next) => !next)}
        className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-semibold ${current.chip}`}
      >
        <span className={`h-2 w-2 rounded-full ${current.dot}`} />
        {current.label} · {counts[current.id] ?? 0}
        <svg viewBox="0 0 20 20" className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open ? (
        <div className="absolute left-0 z-20 mt-1 w-52 rounded-lg border border-line bg-white p-1 shadow-md">
          {MODULES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onChange(item.id);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm ${
                item.id === value ? item.chip : 'text-ink hover:bg-paper'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${item.dot}`} />
              <span className="flex-1 font-semibold">{item.label}</span>
              <span className="text-xs font-normal">{counts[item.id] ?? 0}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Stat({ label, children }) {
  return (
    <div className="rounded-xl border border-line bg-card px-4 py-3">
      <p className="text-sm font-semibold text-ink">{label}</p>
      <p className="mt-1 text-base font-semibold text-ink">{children}</p>
    </div>
  );
}

export function RoleDetail() {
  const { id } = useParams();
  const { can } = usePermission();
  const { user, refreshUser } = useAuth();
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

  const counts = useMemo(() => {
    const next = { all: permissions.length };
    for (const item of MODULES) {
      if (item.id !== 'all') next[item.id] = 0;
    }
    for (const permission of permissions) {
      const key = parentModule(permission.module);
      next[key] = (next[key] || 0) + 1;
    }
    return next;
  }, [permissions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return permissions.filter((permission) => {
      if (moduleTab !== 'all' && parentModule(permission.module) !== moduleTab) return false;
      if (!q) return true;
      return [permission.key, permission.description].some((value) => value?.toLowerCase().includes(q));
    });
  }, [permissions, moduleTab, query]);

  const grouped = useMemo(() => {
    const groups = {};
    for (const permission of filtered) {
      const key = parentModule(permission.module);
      if (!groups[key]) groups[key] = [];
      groups[key].push(permission);
    }
    return MODULES.filter((item) => item.id !== 'all' && groups[item.id]).map((item) => [item.id, groups[item.id]]);
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
      if (user?.role?.slug === updated.slug) await refreshUser().catch(() => {});
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
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-card px-3 py-2">
          <BackButton fallback="/roles" />
          <h1 className="px-1 text-lg font-semibold">Role</h1>
        </div>
        <p className="text-sm text-red-700">{error}</p>
      </div>
    );
  }

  const assignedCount = locked ? permissions.length || 'All' : assigned.length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-card px-3 py-2">
        <BackButton fallback="/roles" />
        <h1 className="px-1 text-lg font-semibold">{role.name}</h1>
        {!locked ? <ModuleMenu value={moduleTab} counts={counts} onChange={setModuleTab} /> : null}
        {!locked ? (
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <SearchField value={query} onChange={setQuery} placeholder="Search permissions" />
            {canEdit && permissions.length ? (
              <>
                <button type="button" onClick={() => setVisible(true)} className="inline-flex items-center rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-semibold text-ink hover:bg-paper">
                  Select visible
                </button>
                <button type="button" onClick={() => setVisible(false)} className="inline-flex items-center rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-semibold text-ink hover:bg-paper">
                  Clear visible
                </button>
              </>
            ) : null}
            {canEdit ? (
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent-dark disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save permissions'}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Type">{role.slug.replaceAll('_', ' ')}</Stat>
        <Stat label="Assigned keys">{assignedCount}</Stat>
        <Stat label="Access">{locked ? 'Full access' : canEdit ? 'Editable' : 'View only'}</Stat>
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {notice ? <p className="text-sm text-emerald-700">{notice}</p> : null}

      {locked ? (
        <section className="rounded-xl border border-line bg-card p-5">
          <p className="text-base font-normal text-ink">Super Admin always has every permission. There is nothing to configure on this role.</p>
          <div className="mt-3">
            <BackButton fallback="/roles" />
          </div>
        </section>
      ) : filtered.length === 0 ? (
        <EmptyState title="No permissions match" hint="Clear search or pick another module." />
      ) : canEdit && permissions.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {grouped.map(([moduleName, items]) => {
            const meta = moduleMeta(moduleName);
            return (
              <section key={moduleName} className="rounded-xl border border-line bg-card p-4">
                <div className="mb-3 flex items-center gap-2 border-b border-line pb-2">
                  <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                  <h2 className="text-base font-semibold text-ink">{meta.label}</h2>
                  <span className="text-sm font-normal text-slate">{items.length}</span>
                </div>
                <div className="space-y-2">
                  {items.map((permission) => (
                    <label key={permission._id} className="flex cursor-pointer items-start gap-2">
                      <input
                        type="checkbox"
                        checked={assigned.includes(permission._id)}
                        onChange={() => toggle(permission._id)}
                        className="mt-1"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-ink">{permission.key}</span>
                        <span className="block text-sm font-normal text-slate">{permission.description}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <section className="rounded-xl border border-line bg-card p-4">
          <div className="flex flex-wrap gap-2">
            {(role.permissions || []).map((permission) => (
              <span key={permission._id} className="rounded-full border border-line bg-paper px-2.5 py-1 text-sm font-semibold text-ink">
                {permission.key}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
