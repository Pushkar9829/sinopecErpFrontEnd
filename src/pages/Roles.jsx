import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { rolesApi } from '../api/roles.api';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { Pagination } from '../components/ui/Pagination';
import { SearchField } from '../components/ui/SearchField';
import { Badge, roleGroupTone } from '../components/ui/Badge';
import { Tabs } from '../components/ui/Tabs';
import { usePagedList } from '../hooks/usePagedList';

const PAGE_SIZE = 8;
const MANAGER_SLUGS = ['sales_manager', 'production_manager', 'inventory_manager', 'dispatch_manager', 'accounts'];
const OPERATOR_SLUGS = ['rolling_operator', 'printing_operator', 'cutting_operator', 'packing_operator'];

function roleGroup(slug) {
  if (slug === 'super_admin') return 'admin';
  if (MANAGER_SLUGS.includes(slug)) return 'managers';
  if (OPERATOR_SLUGS.includes(slug)) return 'operators';
  return 'all';
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
  const [tab, setTab] = useState('all');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    rolesApi.list().then(setRoles).catch((err) => setError(err.message));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return roles.filter((role) => {
      if (tab !== 'all' && roleGroup(role.slug) !== tab) return false;
      if (!q) return true;
      return [role.name, role.slug, role.description].some((value) => value?.toLowerCase().includes(q));
    });
  }, [roles, tab, query]);

  const list = usePagedList(filtered, { pageSize: PAGE_SIZE, resetKey: `${tab}|${query}` });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Roles"
        subtitle="Open a role to review or change its permissions."
        search={<SearchField value={query} onChange={setQuery} placeholder="Search roles" />}
        extra={
          <Tabs
            tabs={[
              { id: 'all', label: 'All', count: roles.length },
              { id: 'managers', label: 'Managers', count: roles.filter((role) => roleGroup(role.slug) === 'managers').length, tone: 'info' },
              { id: 'operators', label: 'Operators', count: roles.filter((role) => roleGroup(role.slug) === 'operators').length, tone: 'teal' },
              { id: 'admin', label: 'Admin', count: roles.filter((role) => roleGroup(role.slug) === 'admin').length, tone: 'accent' },
            ]}
            value={tab}
            onChange={setTab}
          />
        }
      />

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <div className="overflow-hidden rounded-xl border border-line bg-card">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-ink text-paper">
            <tr>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Permissions</th>
              <th className="px-4 py-3 font-medium"> </th>
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
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      navigate(`/roles/${role._id}`);
                    }}
                    className="text-ink hover:underline"
                  >
                    Open
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.total === 0 ? (
          <EmptyState title="No roles found" hint="Try another tab or search." />
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
