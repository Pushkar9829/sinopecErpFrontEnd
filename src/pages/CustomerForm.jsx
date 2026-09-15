import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { customersApi } from '../api/customers.api';
import { Field, Grid, Section, inputClass } from '../components/ui/FormField';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusToggle } from '../components/ui/StatusToggle';
import { usePermission } from '../hooks/usePermission';

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
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

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
      })
      .catch((err) => setError(err.message));
  }, [id]);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (isEdit) {
        await customersApi.update(id, form);
      } else {
        await customersApi.create(form);
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
        subtitle={isEdit ? `Code ${code}` : 'Code is assigned automatically, e.g. CUST-00001.'}
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
