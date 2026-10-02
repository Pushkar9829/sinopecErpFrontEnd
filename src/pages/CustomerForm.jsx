import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { customersApi } from '../api/customers.api';
import { salesSettingsApi } from '../api/salesSettings.api';
import { SalesOrderLineCard } from '../components/sales/SalesOrderLineCard';
import { BackButton } from '../components/ui/BackButton';
import { Field, Grid, Section, inputClass } from '../components/ui/FormField';
import { StatusToggle } from '../components/ui/StatusToggle';
import { usePermission } from '../hooks/usePermission';
import { emptyLineItem, itemFromApi, itemToPayload } from '../lib/sales';

function FormBar({ title, extra }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-card px-3 py-2">
      <BackButton fallback="/customers" />
      <h1 className="px-1 text-lg font-semibold">{title}</h1>
      {extra ? <span className="text-sm text-slate">{extra}</span> : null}
    </div>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M10 4v12M4 10h12" strokeLinecap="round" />
    </svg>
  );
}

const emptyForm = {
  name: '',
  companyName: '',
  contactPerson: '',
  mobile: '',
  email: '',
  gstNumber: '',
  billingAddress: '',
  shippingAddress: '',
  priceCategory: '',
  isActive: true,
};

export function CustomerForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = usePermission();
  const isEdit = Boolean(id);
  const canSave = isEdit ? can('sales:update') : can('sales:create');

  const [form, setForm] = useState(emptyForm);
  const [products, setProducts] = useState([]);
  const [code, setCode] = useState('');
  const [templates, setTemplates] = useState([]);
  const [options, setOptions] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(!isEdit);

  useEffect(() => {
    Promise.all([salesSettingsApi.listTemplates(), salesSettingsApi.options()])
      .then(([nextTemplates, optionData]) => {
        setTemplates(nextTemplates);
        setOptions(optionData.byGroup || {});
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!id) return;
    customersApi
      .get(id)
      .then((customer) => {
        setCode(customer.code);
        setForm({
          name: customer.name || '',
          companyName: customer.companyName || '',
          contactPerson: customer.contactPerson || '',
          mobile: customer.mobile || '',
          email: customer.email || '',
          gstNumber: customer.gstNumber || '',
          billingAddress: customer.billingAddress || '',
          shippingAddress: customer.shippingAddress || '',
          priceCategory: customer.priceCategory || '',
          isActive: customer.isActive !== false,
        });
        setProducts((customer.products || []).map(itemFromApi));
        setLoaded(true);
      })
      .catch((err) => setError(err.message));
  }, [id]);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    const named = products.filter((item) => String(item.product || '').trim());
    setSaving(true);
    try {
      const payload = {
        ...form,
        products: named.map(itemToPayload),
      };
      if (isEdit) {
        await customersApi.update(id, payload);
      } else {
        await customersApi.create(payload);
      }
      navigate('/customers');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) {
    return (
      <div className="space-y-5">
        <FormBar title="Customer" />
        {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : <p className="text-sm text-slate">Loading customer…</p>}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <FormBar title={isEdit ? form.name || 'Customer' : 'Add customer'} extra={isEdit && code ? code : ''} />

      <form onSubmit={handleSubmit} className="space-y-5">
        <Section title="Customer">
          <Grid>
            {isEdit ? (
              <Field label="Customer code">
                <input readOnly value={code} className={inputClass} />
              </Field>
            ) : null}
            <Field label="Customer name">
              <input required value={form.name} disabled={!canSave} onChange={(e) => update('name', e.target.value)} className={inputClass} />
            </Field>
            <Field label="Company name">
              <input value={form.companyName} disabled={!canSave} onChange={(e) => update('companyName', e.target.value)} className={inputClass} />
            </Field>
            <Field label="Contact person">
              <input value={form.contactPerson} disabled={!canSave} onChange={(e) => update('contactPerson', e.target.value)} className={inputClass} />
            </Field>
            <Field label="Mobile">
              <input value={form.mobile} disabled={!canSave} onChange={(e) => update('mobile', e.target.value)} className={inputClass} />
            </Field>
            <Field label="Email">
              <input type="email" value={form.email} disabled={!canSave} onChange={(e) => update('email', e.target.value)} className={inputClass} />
            </Field>
            <Field label="GST number">
              <input value={form.gstNumber} disabled={!canSave} onChange={(e) => update('gstNumber', e.target.value)} className={inputClass} />
            </Field>
            <Field label="Price category">
              <input value={form.priceCategory} disabled={!canSave} onChange={(e) => update('priceCategory', e.target.value)} className={inputClass} />
            </Field>
          </Grid>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Billing address">
              <textarea rows={3} value={form.billingAddress} disabled={!canSave} onChange={(e) => update('billingAddress', e.target.value)} className={inputClass} />
            </Field>
            <Field label="Shipping address">
              <textarea rows={3} value={form.shippingAddress} disabled={!canSave} onChange={(e) => update('shippingAddress', e.target.value)} className={inputClass} />
            </Field>
          </div>
          {isEdit ? (
            <div className="flex items-center justify-between rounded-lg border border-line px-3 py-2">
              <span className="text-base font-semibold text-ink">Status</span>
              <StatusToggle checked={form.isActive} disabled={!canSave} onChange={(isActive) => update('isActive', isActive)} />
            </div>
          ) : null}
        </Section>

        <Section
          title="Attached products"
          actions={
            canSave ? (
              <button
                type="button"
                onClick={() => setProducts((prev) => [...prev, emptyLineItem()])}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-semibold text-ink hover:bg-paper"
              >
                <PlusIcon />
                Add product
              </button>
            ) : null
          }
        >
          {products.length === 0 ? (
            <p className="text-sm text-slate">No products attached yet. Rows left without a product name are skipped on save.</p>
          ) : (
            <div className="space-y-4">
              {products.map((item, index) => (
                <SalesOrderLineCard
                  key={item.uid || item.id || index}
                  item={item}
                  index={index}
                  showCommercial
                  canEdit={canSave}
                  templates={templates}
                  options={options}
                  removable
                  onChange={(next) =>
                    setProducts((prev) => prev.map((row) => (row.uid === item.uid ? (typeof next === 'function' ? next(row) : next) : row)))
                  }
                  onRemove={() => setProducts((prev) => prev.filter((row) => row.uid !== item.uid))}
                />
              ))}
            </div>
          )}
        </Section>

        {error ? <p className="text-sm text-red-700">{error}</p> : null}

        <div className="flex gap-2">
          {canSave ? (
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-dark disabled:opacity-60"
            >
              {saving ? 'Saving…' : isEdit ? 'Save customer' : 'Create customer'}
            </button>
          ) : null}
          <BackButton fallback="/customers" label="Back to list" />
        </div>
      </form>
    </div>
  );
}
