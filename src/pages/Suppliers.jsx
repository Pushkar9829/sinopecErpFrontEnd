import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { suppliersApi } from '../api/suppliers.api';
import { PermissionGate } from '../components/PermissionGate';
import { ActiveBadge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { Pagination } from '../components/ui/Pagination';
import { SearchField } from '../components/ui/SearchField';
import { usePagedList } from '../hooks/usePagedList';

const PAGE_SIZE = 20;

export function Suppliers() {
  const [suppliers, setSuppliers] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let alive = true;
    suppliersApi
      .list()
      .then((rows) => alive && setSuppliers(rows))
      .catch((err) => alive && setError(err.message));
    return () => {
      alive = false;
    };
  }, []);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return suppliers || [];
    return (suppliers || []).filter((s) => [s.code, s.name, s.gstNumber, s.mobile, s.contactPerson, s.materials].some((v) => String(v || '').toLowerCase().includes(q)));
  }, [suppliers, search]);
  const paged = usePagedList(visible, { pageSize: PAGE_SIZE, resetKey: search });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Suppliers"
        subtitle="Who the plant buys material from. Pick one when you receive raw material into the store."
        search={<SearchField value={search} onChange={setSearch} placeholder="Search name, GST, mobile" className="w-full sm:w-64" />}
        actions={
          <PermissionGate permission="inventory:create">
            <Link to="/suppliers/new" className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-dark">
              New supplier
            </Link>
          </PermissionGate>
        }
      />
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {!suppliers && !error ? <p className="text-sm text-slate">Loading suppliers…</p> : null}
      {suppliers && !visible.length ? (
        <EmptyState title={suppliers.length ? 'No supplier matches the search' : 'No suppliers yet'} hint={suppliers.length ? 'Clear the search.' : 'Add the suppliers you buy material from.'} />
      ) : null}
      {visible.length ? (
        <div className="overflow-hidden rounded-xl border border-line bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-paper text-slate">
                <tr>
                  <th className="px-3 py-2 font-medium">Supplier</th>
                  <th className="px-3 py-2 font-medium">GST number</th>
                  <th className="px-3 py-2 font-medium">Contact</th>
                  <th className="px-3 py-2 font-medium">Supplies</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {paged.paged.map((s) => (
                  <tr key={s.id} className="border-t border-line align-top">
                    <td className="px-3 py-2">
                      <Link to={`/suppliers/${s.id}`} className="font-semibold text-accent hover:underline">
                        {s.name}
                      </Link>
                      <div className="text-xs text-slate">{s.code}</div>
                    </td>
                    <td className="px-3 py-2">{s.gstNumber || '—'}</td>
                    <td className="px-3 py-2">{[s.contactPerson, s.mobile].filter(Boolean).join(' · ') || '—'}</td>
                    <td className="max-w-xs truncate px-3 py-2">{s.materials || '—'}</td>
                    <td className="px-3 py-2">
                      <ActiveBadge active={s.isActive} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={paged.page} totalPages={paged.totalPages} total={paged.total} pageSize={PAGE_SIZE} onPage={paged.setPage} />
        </div>
      ) : null}
    </div>
  );
}
