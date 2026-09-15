import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { inventoryApi } from '../api/inventory.api';
import { PermissionGate } from '../components/PermissionGate';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { Pagination } from '../components/ui/Pagination';
import { SearchField } from '../components/ui/SearchField';
import { CategoryBadge } from '../components/ui/Badge';
import { Tabs } from '../components/ui/Tabs';
import { usePagedList } from '../hooks/usePagedList';
import { usePermission } from '../hooks/usePermission';

const PAGE_SIZE = 8;

const CATEGORY_LABELS = {
  raw: 'Raw',
  output: 'Output',
  waste: 'Waste',
};

export function Inventory() {
  const navigate = useNavigate();
  const { can } = usePermission();
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState('all');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function load() {
    setItems(await inventoryApi.listItems());
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  const counts = useMemo(
    () => ({
      all: items.length,
      raw: items.filter((item) => item.category === 'raw').length,
      output: items.filter((item) => item.category === 'output').length,
      waste: items.filter((item) => item.category === 'waste').length,
    }),
    [items]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (tab !== 'all' && item.category !== tab) return false;
      if (!q) return true;
      return [item.name, item.materialType, item.unit, item.stage?.name, CATEGORY_LABELS[item.category]]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(q));
    });
  }, [items, tab, query]);

  const list = usePagedList(filtered, { pageSize: PAGE_SIZE, resetKey: `${tab}|${query}` });

  async function handleDelete(id) {
    if (!window.confirm('Delete this material?')) return;
    setError('');
    try {
      await inventoryApi.removeItem(id);
      await load();
      setNotice('Material deleted.');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Inventory"
        subtitle="Raw stock, stage output, and stage waste. Types, units, and stages are open-ended."
        search={<SearchField value={query} onChange={setQuery} placeholder="Search name, type, unit, or stage" />}
        actions={
          <div className="flex gap-2">
            <Link to="/stages" className="rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-paper">
              Stages
            </Link>
            <PermissionGate permission="inventory:create">
              <Link
                to="/inventory/new"
                className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-dark"
              >
                Add material
              </Link>
            </PermissionGate>
          </div>
        }
        extra={
          <Tabs
            tabs={[
              { id: 'all', label: 'All', count: counts.all },
              { id: 'raw', label: 'Raw', count: counts.raw, tone: 'info' },
              { id: 'output', label: 'Output', count: counts.output, tone: 'success' },
              { id: 'waste', label: 'Waste', count: counts.waste, tone: 'warning' },
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
              <th className="px-4 py-3 font-medium">Material</th>
              <th className="px-4 py-3 font-medium">Kind</th>
              <th className="px-4 py-3 font-medium">Stage</th>
              <th className="px-4 py-3 font-medium">Stock</th>
              <th className="px-4 py-3 font-medium">Unit price</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.paged.map((item) => (
              <tr
                key={item.id}
                tabIndex={0}
                onClick={() => navigate(`/inventory/${item.id}`)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    navigate(`/inventory/${item.id}`);
                  }
                }}
                className="cursor-pointer border-t border-line hover:bg-paper/70"
              >
                <td className="px-4 py-3">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-xs text-slate">
                    {item.materialType}
                    {item.kind === 'wip' ? ' · Stage output' : ''}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <CategoryBadge category={item.category} label={CATEGORY_LABELS[item.category]} />
                </td>
                <td className="px-4 py-3 text-slate">{item.stage?.name || '—'}</td>
                <td className="px-4 py-3">
                  {item.quantity} {item.unit}
                </td>
                <td className="px-4 py-3 text-slate">
                  {item.category === 'waste' || item.unitPrice == null ? '—' : item.unitPrice}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        navigate(`/inventory/${item.id}`);
                      }}
                      className="text-ink hover:underline"
                    >
                      Open
                    </button>
                    {can('inventory:delete') ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDelete(item.id);
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
          <EmptyState title="No materials found" hint="Add a raw, output, or waste item." />
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
