import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { customersApi } from '../api/customers.api';
import { PermissionGate } from '../components/PermissionGate';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { Pagination } from '../components/ui/Pagination';
import { SearchField } from '../components/ui/SearchField';
import { StatusToggle } from '../components/ui/StatusToggle';
import { Tabs } from '../components/ui/Tabs';
import { usePagedList } from '../hooks/usePagedList';
import { usePermission } from '../hooks/usePermission';

const PAGE_SIZE = 8;

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

  useEffect(() => {
    load().catch((err) => setError(err.message));
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
    if (!window.confirm('Delete this customer?')) return;
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
      <PageHeader
        title="Customers"
        subtitle="Customer master used on sales orders. Selecting a customer fills code, GST, and addresses."
        search={<SearchField value={query} onChange={setQuery} placeholder="Search name, code, contact, GST" />}
        actions={
          <PermissionGate permission="sales:create">
            <Link
              to="/customers/new"
              className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-dark"
            >
              Add customer
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
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Contact</th>
              <th className="px-4 py-3 font-medium">GST</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
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
                <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                  <StatusToggle
                    checked={customer.isActive}
                    disabled={!can('sales:update')}
                    onChange={(isActive) => handleToggle(customer, isActive)}
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        navigate(`/customers/${customer.id}`);
                      }}
                      className="text-ink hover:underline"
                    >
                      Open
                    </button>
                    {can('sales:delete') ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDelete(customer.id);
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
