import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usersApi } from '../api/users.api';
import { PermissionGate } from '../components/PermissionGate';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { Pagination } from '../components/ui/Pagination';
import { SearchField } from '../components/ui/SearchField';
import { StatusToggle } from '../components/ui/StatusToggle';
import { Tabs } from '../components/ui/Tabs';
import { useAuth } from '../context/AuthContext';
import { usePagedList } from '../hooks/usePagedList';
import { usePermission } from '../hooks/usePermission';

const PAGE_SIZE = 8;

export function Users() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { can } = usePermission();
  const [users, setUsers] = useState([]);
  const [tab, setTab] = useState('all');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function load() {
    setUsers(await usersApi.list());
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  const counts = useMemo(
    () => ({
      all: users.length,
      active: users.filter((user) => user.isActive).length,
      inactive: users.filter((user) => !user.isActive).length,
    }),
    [users]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((user) => {
      if (tab === 'active' && !user.isActive) return false;
      if (tab === 'inactive' && user.isActive) return false;
      if (!q) return true;
      return [user.fullName, user.username, user.role?.name]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(q));
    });
  }, [users, tab, query]);

  const list = usePagedList(filtered, { pageSize: PAGE_SIZE, resetKey: `${tab}|${query}` });

  async function handleUpdate(id, payload) {
    setError('');
    setNotice('');
    try {
      await usersApi.update(id, payload);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this user?')) return;
    setError('');
    setNotice('');
    try {
      await usersApi.remove(id);
      await load();
      setNotice('User deleted.');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Users"
        subtitle="Browse accounts. Open a person to edit their details."
        search={<SearchField value={query} onChange={setQuery} placeholder="Search name, username, or role" />}
        actions={
          <PermissionGate permission="users:create">
            <Link to="/users/new" className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-dark">
              Add user
            </Link>
          </PermissionGate>
        }
        extra={
          <Tabs
            tabs={[
              { id: 'all', label: 'All', count: counts.all },
              { id: 'active', label: 'Active', count: counts.active, tone: 'success' },
              { id: 'inactive', label: 'Inactive', count: counts.inactive, tone: 'danger' },
            ]}
            value={tab}
            onChange={setTab}
          />
        }
      />

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {notice ? <p className="text-sm text-emerald-700">{notice}</p> : null}

      <div className="overflow-hidden rounded-xl border border-line bg-card">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-ink text-paper">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Username</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.paged.map((user) => (
              <tr
                key={user.id}
                tabIndex={0}
                onClick={() => navigate(`/users/${user.id}`)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    navigate(`/users/${user.id}`);
                  }
                }}
                className="cursor-pointer border-t border-line hover:bg-paper/70"
              >
                <td className="px-4 py-3 font-medium">{user.fullName}</td>
                <td className="px-4 py-3 text-slate">{user.username}</td>
                <td className="px-4 py-3">{user.role?.name}</td>
                <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                  <StatusToggle
                    checked={user.isActive}
                    disabled={!can('users:update')}
                    onChange={(isActive) => handleUpdate(user.id, { isActive })}
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        navigate(`/users/${user.id}`);
                      }}
                      className="text-ink hover:underline"
                    >
                      Open
                    </button>
                    <PermissionGate permission="users:delete">
                      <button
                        type="button"
                        disabled={user.id === currentUser?.id}
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDelete(user.id);
                        }}
                        className="text-red-700 hover:underline disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Delete
                      </button>
                    </PermissionGate>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.total === 0 ? (
          <EmptyState title="No users found" hint="Try another tab or search." />
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
