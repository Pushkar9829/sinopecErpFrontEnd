import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { machinesApi } from '../api/machines.api';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { Pagination } from '../components/ui/Pagination';
import { SearchField } from '../components/ui/SearchField';
import { StatusToggle } from '../components/ui/StatusToggle';
import { usePagedList } from '../hooks/usePagedList';
import { usePermission } from '../hooks/usePermission';

const PAGE_SIZE = 8;

export function Machines() {
  const navigate = useNavigate();
  const { can } = usePermission();
  const canCreate = can('production:create') || can('inventory:create');
  const canUpdate = can('production:update') || can('inventory:update');
  const canDelete = can('production:delete') || can('inventory:delete');
  const [machines, setMachines] = useState([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function load() {
    setMachines(await machinesApi.list());
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return machines;
    return machines.filter((machine) => `${machine.name} ${machine.code}`.toLowerCase().includes(q));
  }, [machines, query]);

  const list = usePagedList(filtered, { pageSize: PAGE_SIZE, resetKey: query });

  async function handleStatus(machine, isActive) {
    setError('');
    try {
      await machinesApi.update(machine.id, { isActive });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(machine) {
    if (!window.confirm(`Delete machine “${machine.name}”?`)) return;
    setError('');
    try {
      await machinesApi.remove(machine.id);
      await load();
      setNotice('Machine deleted.');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Machines"
        subtitle="Create machines, then assign them to a stage."
        search={<SearchField value={query} onChange={setQuery} placeholder="Search name or code" />}
        actions={
          canCreate ? (
            <Link to="/machines/new" className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-dark">
              Add machine
            </Link>
          ) : null
        }
      />
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {notice ? <p className="text-sm text-emerald-700">{notice}</p> : null}

      <div className="overflow-hidden rounded-xl border border-line bg-card">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-ink text-paper">
            <tr>
              <th className="px-4 py-3 font-medium">Machine</th>
              <th className="px-4 py-3 font-medium">Code</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.paged.map((machine) => (
              <tr
                key={machine.id}
                tabIndex={0}
                onClick={() => navigate(`/machines/${machine.id}`)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    navigate(`/machines/${machine.id}`);
                  }
                }}
                className="cursor-pointer border-t border-line hover:bg-paper/70"
              >
                <td className="px-4 py-3 font-medium">{machine.name}</td>
                <td className="px-4 py-3 text-slate">{machine.code || '—'}</td>
                <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                  <StatusToggle
                    checked={machine.isActive}
                    disabled={!canUpdate}
                    onChange={(isActive) => handleStatus(machine, isActive)}
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        navigate(`/machines/${machine.id}`);
                      }}
                      className="hover:underline"
                    >
                      Open
                    </button>
                    {canDelete ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDelete(machine);
                        }}
                        className="text-red-700 hover:underline"
                      >
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
          <EmptyState title="No machines found" hint="Add a machine, then assign it on a stage." />
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
