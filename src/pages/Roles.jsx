import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { rolesApi } from '../api/roles.api';
import { EmptyState } from '../components/ui/EmptyState';
import { Pagination } from '../components/ui/Pagination';
import { SearchField } from '../components/ui/SearchField';
import { Badge, roleGroupTone } from '../components/ui/Badge';
import { usePagedList } from '../hooks/usePagedList';

const PAGE_SIZE = 8;
const MANAGER_SLUGS = ['sales_manager', 'production_manager', 'inventory_manager', 'dispatch_manager', 'accounts'];
const OPERATOR_SLUGS = ['rolling_operator', 'printing_operator', 'cutting_operator', 'packing_operator'];

const GROUP_OPTIONS = [
  { id: 'all', label: 'All', chip: 'border-slate-300 bg-slate-100 text-slate-700', dot: 'bg-slate-500' },
  { id: 'admin', label: 'Admin', chip: 'border-orange-300 bg-orange-100 text-orange-900', dot: 'bg-orange-600' },
  { id: 'managers', label: 'Managers', chip: 'border-sky-300 bg-sky-100 text-sky-800', dot: 'bg-sky-600' },
  { id: 'operators', label: 'Operators', chip: 'border-teal-300 bg-teal-100 text-teal-800', dot: 'bg-teal-600' },
];

function GroupMenu({ value, counts, onChange }) {
  const [open, setOpen] = useState(false);
  const current = GROUP_OPTIONS.find((item) => item.id === value) || GROUP_OPTIONS[0];

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
        aria-label="Role group"
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
          {GROUP_OPTIONS.map((item) => (
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

function roleGroup(slug) {
  if (slug === 'super_admin') return 'admin';
  if (MANAGER_SLUGS.includes(slug)) return 'managers';
  if (OPERATOR_SLUGS.includes(slug)) return 'operators';
  return 'all';
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M12.5 3.5l4 4L7 17H3v-4L12.5 3.5z" strokeLinejoin="round" />
      <path d="M10.5 5.5l4 4" />
    </svg>
  );
}

function groupLabel(slug) {
  const group = roleGroup(slug);
  if (group === 'admin') return 'Admin';
  if (group === 'managers') return 'Manager';
  if (group === 'operators') return 'Operator';
  return 'Role';
}

export function Roles() {
  const navigate = useNavigate();
  const [roles, setRoles] = useState([]);
  const [group, setGroup] = useState('all');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    rolesApi.list().then(setRoles).catch((err) => setError(err.message));
  }, []);

  const counts = useMemo(
    () => ({
      all: roles.length,
      admin: roles.filter((role) => roleGroup(role.slug) === 'admin').length,
      managers: roles.filter((role) => roleGroup(role.slug) === 'managers').length,
      operators: roles.filter((role) => roleGroup(role.slug) === 'operators').length,
    }),
    [roles]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return roles.filter((role) => {
      if (group !== 'all' && roleGroup(role.slug) !== group) return false;
      if (!q) return true;
      return [role.name, role.slug, role.description].some((value) => value?.toLowerCase().includes(q));
    });
  }, [roles, group, query]);

  const list = usePagedList(filtered, { pageSize: PAGE_SIZE, resetKey: `${group}|${query}` });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-card px-3 py-2">
        <h1 className="px-1 text-lg font-semibold">Roles</h1>
        <GroupMenu value={group} counts={counts} onChange={setGroup} />
        <div className="ml-auto">
          <SearchField value={query} onChange={setQuery} placeholder="Search roles" />
        </div>
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <div className="overflow-hidden rounded-xl border border-line bg-card">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-ink text-paper">
            <tr>
              <th className="px-4 py-3 font-semibold">Role</th>
              <th className="px-4 py-3 font-semibold">Type</th>
              <th className="px-4 py-3 font-semibold">Permissions</th>
              <th className="px-4 py-3 font-semibold"> </th>
            </tr>
          </thead>
          <tbody>
            {list.paged.map((role) => (
              <tr
                key={role._id}
                tabIndex={0}
                onClick={() => navigate(`/roles/${role._id}`)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    navigate(`/roles/${role._id}`);
                  }
                }}
                className="cursor-pointer border-t border-line hover:bg-paper/70"
              >
                <td className="px-4 py-3">
                  <p className="font-medium">{role.name}</p>
                  <p className="text-xs text-slate">{role.description}</p>
                </td>
                <td className="px-4 py-3">
                  <Badge tone={roleGroupTone(roleGroup(role.slug))}>{groupLabel(role.slug)}</Badge>
                </td>
                <td className="px-4 py-3 text-slate">{role.slug === 'super_admin' ? 'All' : role.permissions?.length || 0}</td>
                <td className="px-4 py-3 text-right" onClick={(event) => event.stopPropagation()}>
                  <button
                    type="button"
                    title="Edit role"
                    aria-label="Edit role"
                    onClick={() => navigate(`/roles/${role._id}`)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-white text-ink hover:bg-paper"
                  >
                    <PencilIcon />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.total === 0 ? (
          <EmptyState title="No roles found" hint="Try another search." />
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
