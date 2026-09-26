import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { inventoryApi } from '../api/inventory.api';
import { machinesApi } from '../api/machines.api';
import { usersApi } from '../api/users.api';
import { EmptyState } from '../components/ui/EmptyState';
import { Pagination } from '../components/ui/Pagination';
import { SearchField } from '../components/ui/SearchField';
import { SearchMultiSelect } from '../components/ui/SearchMultiSelect';
import { StatusToggle } from '../components/ui/StatusToggle';
import { usePagedList } from '../hooks/usePagedList';
import { usePermission } from '../hooks/usePermission';

const PAGE_SIZE = 8;

const STATUS_OPTIONS = [
  { id: 'all', label: 'All', chip: 'border-slate-300 bg-slate-100 text-slate-700', dot: 'bg-slate-500' },
  { id: 'active', label: 'Active', chip: 'border-emerald-300 bg-emerald-100 text-emerald-800', dot: 'bg-emerald-600' },
  { id: 'inactive', label: 'Inactive', chip: 'border-rose-300 bg-rose-100 text-rose-800', dot: 'bg-rose-600' },
];

const STAGE_COLORS = {
  rolling: { chip: 'border-orange-300 bg-orange-100 text-orange-900', dot: 'bg-orange-600' },
  printing: { chip: 'border-sky-300 bg-sky-100 text-sky-800', dot: 'bg-sky-600' },
  cutting: { chip: 'border-violet-300 bg-violet-100 text-violet-800', dot: 'bg-violet-600' },
  dispatch: { chip: 'border-teal-300 bg-teal-100 text-teal-800', dot: 'bg-teal-600' },
  delivery: { chip: 'border-emerald-300 bg-emerald-100 text-emerald-800', dot: 'bg-emerald-600' },
  packing: { chip: 'border-violet-300 bg-violet-100 text-violet-800', dot: 'bg-violet-600' },
};

function StatusMenu({ value, counts, onChange }) {
  const [open, setOpen] = useState(false);
  const current = STATUS_OPTIONS.find((item) => item.id === value) || STATUS_OPTIONS[0];

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
        aria-label="Status"
        aria-expanded={open}
        onClick={() => setOpen((next) => !next)}
        className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium ${current.chip}`}
      >
        <span className={`h-2 w-2 rounded-full ${current.dot}`} />
        {current.label} · {counts[current.id]}
        <svg viewBox="0 0 20 20" className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open ? (
        <div className="absolute left-0 z-20 mt-1 w-44 rounded-lg border border-line bg-white p-1 shadow-md">
          {STATUS_OPTIONS.map((item) => (
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
              <span className="flex-1">{item.label}</span>
              <span className="text-xs">{counts[item.id]}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function IconButton({ label, className = '', children, ...props }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-white disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M12.5 3.5l4 4L7 17H3v-4L12.5 3.5z" strokeLinejoin="round" />
      <path d="M10.5 5.5l4 4" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M10 4v12M4 10h12" strokeLinecap="round" />
    </svg>
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

export function Stages() {
  const navigate = useNavigate();
  const { can } = usePermission();
  const canCreate = can('production:create') || can('inventory:create');
  const canEdit = can('production:update') || can('inventory:update');
  const canDelete = can('production:delete') || can('inventory:delete');
  const [stages, setStages] = useState([]);
  const [machines, setMachines] = useState([]);
  const [users, setUsers] = useState([]);
  const [name, setName] = useState('');
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('all');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    const [nextStages, nextMachines, nextUsers] = await Promise.all([
      inventoryApi.listStages(),
      machinesApi.list(),
      usersApi.directory(),
    ]);
    setStages(nextStages);
    setMachines(nextMachines);
    setUsers(nextUsers);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  const machineOptions = useMemo(
    () => machines.map((machine) => ({ id: machine.id, label: machine.name, hint: machine.code })),
    [machines]
  );
  const userOptions = useMemo(
    () => users.map((user) => ({ id: user.id, label: user.fullName, hint: user.role?.name || user.username })),
    [users]
  );

  const counts = useMemo(
    () => ({
      all: stages.length,
      active: stages.filter((stage) => stage.isActive !== false).length,
      inactive: stages.filter((stage) => stage.isActive === false).length,
    }),
    [stages]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return stages.filter((stage) => {
      if (tab === 'active' && stage.isActive === false) return false;
      if (tab === 'inactive' && stage.isActive !== false) return false;
      if (!q) return true;
      return [stage.name, ...(stage.machines || []).map((machine) => machine.name), ...(stage.users || []).map((user) => user.fullName)]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(q));
    });
  }, [stages, query, tab]);

  const list = usePagedList(filtered, { pageSize: PAGE_SIZE, resetKey: `${tab}|${query}` });

  async function handleCreate(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    setSaving(true);
    try {
      await inventoryApi.createStage({ name });
      setName('');
      await load();
      setNotice('Stage added.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleAssign(stage, payload) {
    setError('');
    setNotice('');
    try {
      const updated = await inventoryApi.updateStage(stage.id, payload);
      setStages((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(stage) {
    if (!window.confirm(`Delete stage “${stage.name}”?`)) return;
    setError('');
    try {
      await inventoryApi.removeStage(stage.id);
      await load();
      setNotice('Stage deleted.');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-card px-3 py-2">
        <h1 className="px-1 text-lg font-semibold">Stages</h1>
        <StatusMenu value={tab} counts={counts} onChange={setTab} />
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <SearchField value={query} onChange={setQuery} placeholder="Search stages" />
          {canCreate ? (
            <form onSubmit={handleCreate} className="flex items-center gap-2">
              <input
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="New stage name"
                className="w-40 rounded-lg border border-line bg-white px-3 py-1.5 text-sm outline-none focus:border-accent"
              />
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent-dark disabled:opacity-60"
              >
                {saving ? null : <PlusIcon />}
                {saving ? 'Adding...' : 'Add'}
              </button>
            </form>
          ) : null}
          <Link to="/machines" className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-semibold text-ink hover:bg-paper">
            Machines
          </Link>
        </div>
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {notice ? <p className="text-sm text-emerald-700">{notice}</p> : null}

      <div className="rounded-xl border border-line bg-card">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-ink text-paper">
            <tr>
              <th className="px-4 py-3 font-semibold">Stage</th>
              <th className="px-4 py-3 font-semibold">Machines</th>
              <th className="px-4 py-3 font-semibold">People</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Assign machines</th>
              <th className="px-4 py-3 font-semibold">Assign users</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.paged.map((stage) => (
              <tr
                key={stage.id}
                tabIndex={0}
                onClick={() => navigate(`/stages/${stage.id}`)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    navigate(`/stages/${stage.id}`);
                  }
                }}
                className="cursor-pointer border-t border-line align-top hover:bg-paper/70"
              >
                <td className="px-4 py-3 font-semibold">
                  <span
                    className={`inline-flex items-center gap-2 rounded-lg border px-2 py-1 text-sm ${
                      (STAGE_COLORS[stage.slug] || { chip: 'border-slate-300 bg-slate-100 text-slate-700' }).chip
                    }`}
                  >
                    <span className={`h-2 w-2 rounded-full ${(STAGE_COLORS[stage.slug] || { dot: 'bg-slate-500' }).dot}`} />
                    {stage.name}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate">{stage.machines?.length || 0}</td>
                <td className="px-4 py-3 text-slate">{stage.users?.length || 0}</td>
                <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                  <StatusToggle
                    checked={stage.isActive !== false}
                    disabled={!canEdit}
                    onChange={(isActive) => handleAssign(stage, { isActive })}
                  />
                </td>
                <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                  <SearchMultiSelect
                    options={machineOptions}
                    value={(stage.machines || []).map((machine) => machine.id)}
                    disabled={!canEdit}
                    placeholder="Select machines"
                    searchPlaceholder="Search machines"
                    onChange={(machineIds) => handleAssign(stage, { machineIds })}
                  />
                </td>
                <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                  <SearchMultiSelect
                    options={userOptions}
                    value={(stage.users || []).map((user) => user.id)}
                    disabled={!canEdit}
                    placeholder="Select users"
                    searchPlaceholder="Search users"
                    onChange={(userIds) => handleAssign(stage, { userIds })}
                  />
                </td>
                <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                  <div className="flex items-center gap-1.5">
                    <IconButton label="Edit stage" className="text-ink hover:bg-paper" onClick={() => navigate(`/stages/${stage.id}`)}>
                      <PencilIcon />
                    </IconButton>
                    {canDelete ? (
                      <IconButton label="Delete stage" className="text-red-700 hover:bg-red-50" onClick={() => handleDelete(stage)}>
                        <TrashIcon />
                      </IconButton>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.total === 0 ? (
          <EmptyState title="No stages found" hint="Add a stage to start assigning machines and people." />
        ) : (
          <Pagination
            page={list.page}
            totalPages={list.totalPages}
            total={list.total}
            pageSize={list.pageSize}
            onPage={list.setPage}
          />
        )}
      </div>
    </div>
  );
}
