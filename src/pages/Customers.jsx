import { confirmAction } from '../components/ui/ConfirmHost';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { customersApi } from '../api/customers.api';
import { PermissionGate } from '../components/PermissionGate';
import { EmptyState } from '../components/ui/EmptyState';
import { Pagination } from '../components/ui/Pagination';
import { SearchField } from '../components/ui/SearchField';
import { StatusToggle } from '../components/ui/StatusToggle';
import { usePagedList } from '../hooks/usePagedList';
import { usePermission } from '../hooks/usePermission';

const PAGE_SIZE = 8;

const STATUS_OPTIONS = [
  { id: 'all', label: 'All', chip: 'border-slate-300 bg-slate-100 text-slate-700', dot: 'bg-slate-500' },
  { id: 'active', label: 'Active', chip: 'border-emerald-300 bg-emerald-100 text-emerald-800', dot: 'bg-emerald-600' },
  { id: 'inactive', label: 'Inactive', chip: 'border-rose-300 bg-rose-100 text-rose-800', dot: 'bg-rose-600' },
];

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

function PlusIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M10 4v12M4 10h12" strokeLinecap="round" />
    </svg>
  );
}

export function Customers() {
  const navigate = useNavigate();
  const { can } = usePermission();
  const [customers, setCustomers] = useState([]);
  const [tab, setTab] = useState('all');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function load() {
    setCustomers(await customersApi.list());
  }

  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    load()
      .catch((err) => setError(err.message))
      .finally(() => setLoaded(true));
  }, []);

  const counts = useMemo(
    () => ({
      all: customers.length,
      active: customers.filter((customer) => customer.isActive).length,
      inactive: customers.filter((customer) => !customer.isActive).length,
    }),
    [customers]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return customers.filter((customer) => {
      if (tab === 'active' && !customer.isActive) return false;
      if (tab === 'inactive' && customer.isActive) return false;
      if (!q) return true;
      return [customer.name, customer.companyName, customer.code, customer.contactPerson, customer.mobile, customer.gstNumber]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(q));
    });
  }, [customers, tab, query]);

  const list = usePagedList(filtered, { pageSize: PAGE_SIZE, resetKey: `${tab}|${query}` });

  async function handleToggle(customer, isActive) {
    setError('');
    setNotice('');
    try {
      await customersApi.update(customer.id, { isActive });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!(await confirmAction({ message: 'Delete this customer?', confirmLabel: 'Delete', danger: true }))) return;
    setError('');
    try {
      await customersApi.remove(id);
      await load();
      setNotice('Customer deleted.');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-card px-3 py-2">
        <h1 className="px-1 text-lg font-semibold">Customers</h1>
        <StatusMenu value={tab} counts={counts} onChange={setTab} />
        <div className="ml-auto flex items-center gap-2">
          <SearchField value={query} onChange={setQuery} placeholder="Search name, code, contact, GST" />
          <PermissionGate permission="sales:create">
            <Link
              to="/customers/new"
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent-dark"
            >
              <PlusIcon />
              Add customer
            </Link>
          </PermissionGate>
        </div>
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {notice ? <p className="text-sm text-emerald-700">{notice}</p> : null}

      <div className="overflow-x-auto rounded-xl border border-line bg-card">
        <table className="min-w-full whitespace-nowrap text-left text-sm lg:whitespace-normal">
          <thead className="bg-ink text-paper">
            <tr>
              <th className="px-4 py-3 font-semibold">Customer</th>
              <th className="px-4 py-3 font-semibold">Contact</th>
              <th className="px-4 py-3 font-semibold">GST</th>
              <th className="px-4 py-3 font-semibold">Category</th>
              <th className="px-4 py-3 font-semibold">Products</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.paged.map((customer) => (
              <tr
                key={customer.id}
                tabIndex={0}
                onClick={() => navigate(`/customers/${customer.id}`)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    navigate(`/customers/${customer.id}`);
                  }
                }}
                className="cursor-pointer border-t border-line hover:bg-paper/70"
              >
                <td className="px-4 py-3">
                  <p className="font-medium">{customer.name}</p>
                  <p className="text-xs text-slate">
                    {customer.code}
                    {customer.companyName ? ` · ${customer.companyName}` : ''}
                  </p>
                </td>
                <td className="px-4 py-3 text-slate">
                  {customer.contactPerson || '—'}
                  <p className="text-xs">{customer.mobile || customer.email || ''}</p>
                </td>
                <td className="px-4 py-3 text-slate">{customer.gstNumber || '—'}</td>
                <td className="px-4 py-3 text-slate">{customer.priceCategory || '—'}</td>
                <td className="px-4 py-3 text-slate">{customer.products?.length || 0}</td>
                <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                  <StatusToggle
                    checked={customer.isActive}
                    disabled={!can('sales:update')}
                    onChange={(isActive) => handleToggle(customer, isActive)}
                  />
                </td>
                <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                  <div className="flex items-center gap-1.5">
                    <IconButton label="Edit customer" className="text-ink hover:bg-paper" onClick={() => navigate(`/customers/${customer.id}`)}>
                      <PencilIcon />
                    </IconButton>
                    {can('sales:delete') ? (
                      <IconButton label="Delete customer" className="text-red-700 hover:bg-red-50" onClick={() => handleDelete(customer.id)}>
                        <TrashIcon />
                      </IconButton>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loaded ? (
          <p className="px-4 py-6 text-sm text-slate">Loading…</p>
        ) : list.total === 0 ? (
          <EmptyState title="No customers found" hint="Add a customer before creating a sales order." />
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
