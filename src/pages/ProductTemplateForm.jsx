import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { salesSettingsApi } from '../api/salesSettings.api';
import { SalesOrderLineCard } from '../components/sales/SalesOrderLineCard';
import { Field, Section, inputClass } from '../components/ui/FormField';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusToggle } from '../components/ui/StatusToggle';
import { usePermission } from '../hooks/usePermission';
import { emptyLineItem, itemFromApi, itemToPayload } from '../lib/sales';

export function ProductTemplateForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = usePermission();
  const isEdit = Boolean(id);
  const canSave = isEdit ? can('sales:update') : can('sales:create');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [spec, setSpec] = useState(emptyLineItem());
  const [options, setOptions] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    salesSettingsApi
      .options()
      .then((data) => setOptions(data.byGroup || {}))
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!id) return;
    salesSettingsApi
      .getTemplate(id)
      .then((template) => {
        setName(template.name);
        setCode(template.code || '');
        setIsActive(template.isActive !== false);
        setSpec(itemFromApi(template));
      })
      .catch((err) => setError(err.message));
  }, [id]);

  function updateSpec(next) {
    setSpec(next);
    if (!name.trim() && next.product) {
      setName(next.product);
    }
    if (!code.trim() && next.productCode) {
      setCode(next.productCode);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!name.trim()) {
      setError('Give this saved product a short name, such as Printed bag 20×30.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const payload = { name, code, isActive, ...itemToPayload(spec) };
      if (isEdit) await salesSettingsApi.updateTemplate(id, payload);
      else await salesSettingsApi.createTemplate(payload);
      navigate('/sales-settings');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <PageHeader
        title={isEdit ? name || 'Edit saved product' : 'Save a product'}
        subtitle="Fill this once. Next time, choose it on the sales order and only change quantity if needed."
        backTo="/sales-settings"
        backLabel="Product setup"
        actions={
          canSave ? (
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-accent px-4 py-1.5 text-sm font-medium text-white hover:bg-accent-dark disabled:opacity-60"
            >
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Save product'}
            </button>
          ) : null
        }
      />

      <section className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-slate">
        Start with the name people will look for. Then pick sizes and materials from the lists, or type a new value.
      </section>

      <Section title="How it will appear">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Name on the list">
            <input
              required
              value={name}
              disabled={!canSave}
              onChange={(event) => setName(event.target.value)}
              placeholder="Printed bag 20×30"
              className={inputClass}
            />
          </Field>
          <Field label="Short code (optional)">
            <input
              value={code}
              disabled={!canSave}
              onChange={(event) => setCode(event.target.value)}
              placeholder="BAG-001"
              className={inputClass}
            />
          </Field>
          <div className="flex items-end pb-2">
            <StatusToggle
              checked={isActive}
              disabled={!canSave}
              onChange={setIsActive}
              labels={['Hidden', 'Ready to use']}
            />
          </div>
        </div>
      </Section>

      <div className="space-y-2">
        <h2 className="text-sm font-medium">Product details</h2>
        <p className="text-sm text-slate">Same fields as a sales order line. Click a box and pick from the list, or type.</p>
      </div>

      <SalesOrderLineCard
        item={spec}
        index={0}
        hideTemplate
        showCommercial={can('sales:read')}
        canEdit={canSave}
        options={options}
        onChange={updateSpec}
      />

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      {canSave ? (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-dark disabled:opacity-60"
          >
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Save product'}
          </button>
          <p className="text-xs text-slate">This does not change sales orders already created.</p>
        </div>
      ) : null}
    </form>
  );
}
