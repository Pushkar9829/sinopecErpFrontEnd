import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { inventoryApi } from '../api/inventory.api';
import { machinesApi } from '../api/machines.api';
import { usersApi } from '../api/users.api';
import { PageHeader } from '../components/ui/PageHeader';
import { SearchField } from '../components/ui/SearchField';
import { usePermission } from '../hooks/usePermission';

export function StageDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
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
        <PageHeader title="Stage" backTo="/stages" backLabel="Stages" />
        <p className="text-sm text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={stage.name}
        subtitle="Assign machines and users who work on this stage."
        backTo="/stages"
        backLabel="Stages"
      />

      <form onSubmit={handleSave} className="space-y-5">
        <label className="block max-w-xl text-sm text-slate">
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
          <section className="rounded-xl border border-line bg-card p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-medium">Machines</h2>
              <div className="flex items-center gap-2">
                <SearchField value={machineQuery} onChange={setMachineQuery} placeholder="Search machines" />
                <span className="text-xs text-steel">{machineIds.length} selected</span>
              </div>
            </div>
            <div className="mt-3 max-h-80 space-y-1 overflow-y-auto">
              {visibleMachines.map((machine) => (
                <label key={machine.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-paper">
                  <input
                    type="checkbox"
                    disabled={!canEdit}
                    checked={machineIds.includes(machine.id)}
                    onChange={() => toggle(machineIds, setMachineIds, machine.id)}
                  />
                  <span>
                    <span className="font-medium">{machine.name}</span>
                    {machine.code ? <span className="ml-2 text-xs text-steel">{machine.code}</span> : null}
                  </span>
                </label>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-line bg-card p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-medium">Users</h2>
              <div className="flex items-center gap-2">
                <SearchField value={userQuery} onChange={setUserQuery} placeholder="Search users" />
                <span className="text-xs text-steel">{userIds.length} selected</span>
              </div>
            </div>
            <div className="mt-3 max-h-80 space-y-1 overflow-y-auto">
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
                    <span className="ml-2 text-xs text-steel">{user.role?.name}</span>
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
              className="rounded-lg bg-accent px-4 py-2 font-medium text-white hover:bg-accent-dark disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save assignments'}
            </button>
          ) : null}
          <button type="button" onClick={() => navigate('/stages')} className="rounded-lg border border-line px-4 py-2">
            Back to list
          </button>
        </div>
      </form>
    </div>
  );
}
