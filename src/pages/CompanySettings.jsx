import { useEffect, useState } from 'react';
import { companyApi } from '../api/company.api';
import { Field, Grid, Section, inputClass } from '../components/ui/FormField';
import { PageHeader } from '../components/ui/PageHeader';
import { useLeaveGuard } from '../hooks/useLeaveGuard';
import { usePermission } from '../hooks/usePermission';

const SECTIONS = [
  {
    title: 'Business',
    fields: [
      ['legalName', 'Legal name', { required: true }],
      ['gstin', 'GSTIN', { placeholder: '07ABCDE1234F1Z5' }],
      ['pan', 'PAN'],
      ['udyam', 'UDYAM number'],
      ['email', 'Email', { type: 'email' }],
      ['phone', 'Phone'],
    ],
  },
  {
    title: 'Address',
    fields: [
      ['address', 'Address', { wide: true }],
      ['city', 'City'],
      ['state', 'State'],
      ['pinCode', 'PIN code'],
    ],
  },
  {
    title: 'Bank (printed on invoices)',
    fields: [
      ['bankName', 'Bank name'],
      ['bankAccountName', 'Account name'],
      ['bankAccountNumber', 'Account number'],
      ['bankIfsc', 'IFSC', { placeholder: 'HDFC0001234' }],
      ['bankBranch', 'Branch'],
    ],
  },
  {
    title: 'Defaults',
    fields: [
      ['defaultCreditDays', 'Credit days for new customers', { type: 'number' }],
      ['overdueHoldDays', 'Credit hold when a bill is overdue more than (days)', { type: 'number' }],
      ['defaultGstPercent', 'GST % on new order lines', { type: 'number' }],
      ['defaultHsnCode', 'HSN code when a product has none'],
      ['invoicePrefix', 'Invoice number prefix (up to 5 letters)', { placeholder: 'SP', maxLength: 5 }],
      ['proformaPrefix', 'Proforma number prefix', { placeholder: 'PI' }],
      ['invoiceTerms', 'Terms printed on invoices', { wide: true, textarea: true }],
    ],
  },
];

export function CompanySettings() {
  const { user } = usePermission();
  const isSuperAdmin = user?.role?.slug === 'super_admin';
  const [form, setForm] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  useLeaveGuard(dirty);

  useEffect(() => {
    companyApi
      .get()
      .then(setForm)
      .catch((err) => setError(err.message));
  }, []);

  function set(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setDirty(true);
    setNotice('');
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      setForm(await companyApi.save(form));
      setDirty(false);
      setNotice('Saved.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!form) return <p className="text-sm text-slate">{error || 'Loading company details…'}</p>;

  return (
    <form onSubmit={save} className="space-y-4">
      <PageHeader title="Company details" subtitle="Printed on invoices, proformas and statements, and the defaults for new customers and orders." />
      {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p> : null}
      {notice ? <p className="text-sm text-emerald-800">{notice}</p> : null}
      {!form.gstin ? <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950">Add your GSTIN: invoices need it, and it decides CGST + SGST or IGST for each customer.</p> : null}
      {SECTIONS.map((section) => (
        <Section key={section.title} title={section.title}>
          <Grid>
            {section.fields.map(([key, label, options = {}]) => (
              <Field key={key} label={label} mark={options.required} className={options.wide ? 'sm:col-span-2 lg:col-span-3' : ''}>
                {options.textarea ? (
                  <textarea rows={3} value={form[key] ?? ''} disabled={!isSuperAdmin} onChange={(e) => set(key, e.target.value)} className={inputClass} />
                ) : (
                  <input
                    type={options.type || 'text'}
                    required={options.required}
                    min={options.type === 'number' ? 0 : undefined}
                    value={form[key] ?? ''}
                    placeholder={options.placeholder}
                    maxLength={options.maxLength}
                    disabled={!isSuperAdmin}
                    onChange={(e) => set(key, e.target.value)}
                    className={inputClass}
                  />
                )}
              </Field>
            ))}
          </Grid>
        </Section>
      ))}
      {isSuperAdmin ? (
        <button type="submit" disabled={saving || !dirty} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-dark disabled:opacity-60">
          {saving ? 'Saving…' : 'Save company details'}
        </button>
      ) : (
        <p className="text-sm text-slate">Only the Super Admin can change these.</p>
      )}
    </form>
  );
}
