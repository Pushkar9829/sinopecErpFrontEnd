import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { customersApi } from '../api/customers.api';
import { salesSettingsApi } from '../api/salesSettings.api';
import { SalesOrderLineCard } from '../components/sales/SalesOrderLineCard';
import { Field, Grid, Section, inputClass } from '../components/ui/FormField';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusToggle } from '../components/ui/StatusToggle';
import { usePermission } from '../hooks/usePermission';
import { emptyLineItem, itemFromApi, itemToPayload } from '../lib/sales';

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
      })
      .catch((err) => setError(err.message));
  }, [id]);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    if (products.some((item) => !String(item.product || '').trim())) {
      setError('Each attached product needs a product name, or remove empty rows');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        products: products.map(itemToPayload),
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

  return (
    <div className="space-y-5">
      <PageHeader
        title={isEdit ? 'Edit customer' : 'Add customer'}
        subtitle={
          isEdit
            ? `Code ${code}. Attach products so they fill into new sales orders automatically.`
            : 'Code is assigned automatically. Attach products this customer usually orders.'
        }
        backTo="/customers"
        backLabel="Customers"
      />

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
            <StatusToggle checked={form.isActive} disabled={!canSave} onChange={(isActive) => update('isActive', isActive)} />
          ) : null}
        </Section>

        <Section
          title="Attached products"
          actions={
            canSave ? (
              <button
                type="button"
                onClick={() => setProducts((prev) => [...prev, emptyLineItem()])}
                className="rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-paper"
              >
                Add product
              </button>
            ) : null
          }
        >
          {products.length === 0 ? (
            <p className="text-sm text-slate">
              No products attached yet. Add the SKUs this customer usually buys — they will auto-fill when you create a sales order.
            </p>
          ) : (
            <div className="space-y-4">
              {products.map((item, index) => (
                <SalesOrderLineCard
                  key={item.id || index}
                  item={item}
                  index={index}
                  showCommercial
                  canEdit={canSave}
                  templates={templates}
                  options={options}
                  removable={products.length > 1}
                  onChange={(next) => setProducts((prev) => prev.map((row, rowIndex) => (rowIndex === index ? next : row)))}
                  onRemove={() => setProducts((prev) => prev.filter((_, rowIndex) => rowIndex !== index))}
                />
              ))}
            </div>
          )}
        </Section>

        {error ? <p className="text-sm text-red-700">{error}</p> : null}

        {canSave ? (
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-dark disabled:opacity-60"
          >
            {saving ? 'Saving…' : isEdit ? 'Save customer' : 'Create customer'}
          </button>
        ) : null}
      </form>
    </div>
  );
}
