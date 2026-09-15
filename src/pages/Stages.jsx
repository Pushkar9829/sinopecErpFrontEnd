import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { inventoryApi } from '../api/inventory.api';
import { machinesApi } from '../api/machines.api';
import { usersApi } from '../api/users.api';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { Pagination } from '../components/ui/Pagination';
import { SearchField } from '../components/ui/SearchField';
import { SearchMultiSelect } from '../components/ui/SearchMultiSelect';
import { usePagedList } from '../hooks/usePagedList';
import { usePermission } from '../hooks/usePermission';

const PAGE_SIZE = 8;

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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return stages;
    return stages.filter((stage) =>
      [stage.name, ...(stage.machines || []).map((machine) => machine.name), ...(stage.users || []).map((user) => user.fullName)]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(q))
    );
  }, [stages, query]);

  const list = usePagedList(filtered, { pageSize: PAGE_SIZE, resetKey: query });

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
      <PageHeader
        title="Stages"
        subtitle="Assign machines and users from the dropdowns."
        search={<SearchField value={query} onChange={setQuery} placeholder="Search stages" />}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {canCreate ? (
              <form onSubmit={handleCreate} className="flex items-center gap-2">
                <input
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="New stage name"
                  className="w-44 rounded-lg border border-line bg-white px-3 py-1.5 text-sm outline-none focus:border-accent"
                />
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-dark disabled:opacity-60"
                >
                  {saving ? 'Adding...' : 'Add'}
                </button>
              </form>
            ) : null}
            <Link to="/machines" className="rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-paper">
              Machines
            </Link>
          </div>
        }
      />

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {notice ? <p className="text-sm text-emerald-700">{notice}</p> : null}

      <div className="rounded-xl border border-line bg-card">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-ink text-paper">
            <tr>
              <th className="px-4 py-3 font-medium">Stage</th>
              <th className="px-4 py-3 font-medium">Machines</th>
              <th className="px-4 py-3 font-medium">People</th>
              <th className="px-4 py-3 font-medium">Assign machines</th>
              <th className="px-4 py-3 font-medium">Assign users</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.paged.map((stage) => (
              <tr key={stage.id} className="border-t border-line align-top hover:bg-paper/70">
                <td className="px-4 py-3 font-medium">{stage.name}</td>
                <td className="px-4 py-3 text-slate">{stage.machines?.length || 0}</td>
                <td className="px-4 py-3 text-slate">{stage.users?.length || 0}</td>
                <td className="px-4 py-3">
                  <SearchMultiSelect
                    options={machineOptions}
                    value={(stage.machines || []).map((machine) => machine.id)}
                    disabled={!canEdit}
                    placeholder="Select machines"
                    searchPlaceholder="Search machines"
                    onChange={(machineIds) => handleAssign(stage, { machineIds })}
                  />
                </td>
                <td className="px-4 py-3">
                  <SearchMultiSelect
                    options={userOptions}
                    value={(stage.users || []).map((user) => user.id)}
                    disabled={!canEdit}
                    placeholder="Select users"
                    searchPlaceholder="Search users"
                    onChange={(userIds) => handleAssign(stage, { userIds })}
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-3 pt-1">
                    <button type="button" onClick={() => navigate(`/stages/${stage.id}`)} className="hover:underline">
                      Open
                    </button>
                    {canDelete ? (
                      <button type="button" onClick={() => handleDelete(stage)} className="text-red-700 hover:underline">
                        Delete
                      </button>
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
