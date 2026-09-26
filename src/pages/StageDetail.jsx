import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { inventoryApi } from '../api/inventory.api';
import { machinesApi } from '../api/machines.api';
import { usersApi } from '../api/users.api';
import { BackButton } from '../components/ui/BackButton';
import { SearchField } from '../components/ui/SearchField';
import { usePermission } from '../hooks/usePermission';

const STAGE_COLORS = {
  rolling: { chip: 'border-orange-300 bg-orange-100 text-orange-900', dot: 'bg-orange-600' },
  printing: { chip: 'border-sky-300 bg-sky-100 text-sky-800', dot: 'bg-sky-600' },
  cutting: { chip: 'border-violet-300 bg-violet-100 text-violet-800', dot: 'bg-violet-600' },
  dispatch: { chip: 'border-teal-300 bg-teal-100 text-teal-800', dot: 'bg-teal-600' },
  delivery: { chip: 'border-emerald-300 bg-emerald-100 text-emerald-800', dot: 'bg-emerald-600' },
  packing: { chip: 'border-violet-300 bg-violet-100 text-violet-800', dot: 'bg-violet-600' },
};

function FormBar({ title, slug }) {
  const tone = STAGE_COLORS[slug] || { chip: 'border-slate-300 bg-slate-100 text-slate-700', dot: 'bg-slate-500' };
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-card px-3 py-2">
      <BackButton fallback="/stages" />
      <h1 className={`inline-flex items-center gap-2 rounded-lg border px-2.5 py-1 text-lg font-semibold ${tone.chip}`}>
        <span className={`h-2 w-2 rounded-full ${tone.dot}`} />
        {title}
      </h1>
    </div>
  );
}

export function StageDetail() {
  const { id } = useParams();
  const { can } = usePermission();
  const canEdit = can('production:update') || can('inventory:update');
  const [stage, setStage] = useState(null);
  const [machines, setMachines] = useState([]);
  const [users, setUsers] = useState([]);
  const [machineIds, setMachineIds] = useState([]);
  const [userIds, setUserIds] = useState([]);
  const [name, setName] = useState('');
  const [machineQuery, setMachineQuery] = useState('');
  const [userQuery, setUserQuery] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([inventoryApi.getStage(id), machinesApi.list(), usersApi.directory()])
      .then(([nextStage, nextMachines, nextUsers]) => {
        setStage(nextStage);
        setName(nextStage.name);
        setMachines(nextMachines);
        setUsers(nextUsers);
        setMachineIds((nextStage.machines || []).map((machine) => machine.id));
        setUserIds((nextStage.users || []).map((user) => user.id));
      })
      .catch((err) => setError(err.message));
  }, [id]);

  const visibleMachines = useMemo(() => {
    const q = machineQuery.trim().toLowerCase();
    return machines.filter((machine) => !q || `${machine.name} ${machine.code}`.toLowerCase().includes(q));
  }, [machines, machineQuery]);

  const visibleUsers = useMemo(() => {
    const q = userQuery.trim().toLowerCase();
    return users.filter(
      (user) => !q || `${user.fullName} ${user.username} ${user.role?.name || ''}`.toLowerCase().includes(q)
    );
  }, [users, userQuery]);

  function toggle(list, setList, value) {
    setList((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]));
  }

  async function handleSave(event) {
    event.preventDefault();
    if (!canEdit) return;
    setError('');
    setNotice('');
    setSaving(true);
    try {
      const updated = await inventoryApi.updateStage(id, { name, machineIds, userIds });
      setStage(updated);
      setNotice('Assignments saved.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!stage && !error) {
    return <p className="text-sm text-slate">Loading...</p>;
  }

  if (!stage) {
    return (
      <div className="space-y-3">
        <FormBar title="Stage" />
        <p className="text-sm text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <FormBar title={name || stage.name} slug={stage.slug} />

      <form onSubmit={handleSave} className="space-y-5">
        <label className="block max-w-xl text-base font-semibold text-ink">
          Stage name
          <input
            required
            disabled={!canEdit}
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 outline-none focus:border-accent disabled:bg-paper"
          />
        </label>

        <div className="grid gap-5 lg:grid-cols-2">
          <section className="overflow-hidden rounded-xl border border-line bg-card">
            <div className="flex items-center gap-2 border-b border-line px-3 py-2">
              <h2 className="text-sm font-semibold">Machines</h2>
              <span className="rounded-lg border border-slate-300 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                {machineIds.length} selected
              </span>
              <div className="ml-auto">
                <SearchField value={machineQuery} onChange={setMachineQuery} placeholder="Search machines" className="w-44" />
              </div>
            </div>
            <div className="max-h-80 space-y-1 overflow-y-auto p-2">
              {visibleMachines.map((machine) => {
                const selected = machineIds.includes(machine.id);
                return (
                  <label
                    key={machine.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm ${
                      selected ? 'border-line bg-paper' : 'border-transparent hover:bg-paper'
                    }`}
                  >
                    <input
                      type="checkbox"
                      disabled={!canEdit}
                      checked={selected}
                      onChange={() => toggle(machineIds, setMachineIds, machine.id)}
                      className="h-4 w-4 shrink-0"
                    />
                    <span className="min-w-0 flex-1 truncate font-medium">{machine.name}</span>
                    {machine.code ? (
                      <span className="shrink-0 rounded-md border border-line bg-white px-2 py-0.5 text-xs tracking-wide text-slate">
                        {machine.code}
                      </span>
                    ) : null}
                  </label>
                );
              })}
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-line bg-card">
            <div className="flex items-center gap-2 border-b border-line px-3 py-2">
              <h2 className="text-sm font-semibold">Users</h2>
              <span className="rounded-lg border border-slate-300 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                {userIds.length} selected
              </span>
              <div className="ml-auto">
                <SearchField value={userQuery} onChange={setUserQuery} placeholder="Search users" className="w-44" />
              </div>
            </div>
            <div className="max-h-80 space-y-1 overflow-y-auto p-2">
              {visibleUsers.map((user) => (
                <label key={user.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-paper">
                  <input
                    type="checkbox"
                    disabled={!canEdit}
                    checked={userIds.includes(user.id)}
                    onChange={() => toggle(userIds, setUserIds, user.id)}
                  />
                  <span>
                    <span className="font-medium">{user.fullName}</span>
                    {user.role?.name ? <span className="block text-xs text-steel">{user.role.name}</span> : null}
                  </span>
                </label>
              ))}
            </div>
          </section>
        </div>

        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        {notice ? <p className="text-sm text-emerald-700">{notice}</p> : null}

        <div className="flex gap-2">
          {canEdit ? (
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-dark disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save assignments'}
            </button>
          ) : null}
          <BackButton fallback="/stages" label="Back to list" />
        </div>
      </form>
    </div>
  );
}
