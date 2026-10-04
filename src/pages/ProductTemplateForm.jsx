import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { salesSettingsApi } from '../api/salesSettings.api';
import { SalesOrderLineCard } from '../components/sales/SalesOrderLineCard';
import { BackButton } from '../components/ui/BackButton';
import { StatusToggle } from '../components/ui/StatusToggle';
import { usePermission } from '../hooks/usePermission';
import { emptyLineItem, itemFromApi, itemToPayload } from '../lib/sales';

export function ProductTemplateForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = usePermission();
  const isEdit = Boolean(id);
  const canSave = isEdit ? can('sales:update') : can('sales:create');
  const [isActive, setIsActive] = useState(true);
  const [spec, setSpec] = useState(emptyLineItem());
  const [options, setOptions] = useState({});
  const [templates, setTemplates] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([salesSettingsApi.options(), salesSettingsApi.listTemplates()])
      .then(([data, saved]) => {
        setOptions(data.byGroup || {});
        setTemplates(saved);
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!id) return;
    salesSettingsApi
      .getTemplate(id)
      .then((template) => {
        setIsActive(template.isActive !== false);
        const next = itemFromApi(template);
        if (!next.product) next.product = template.name || '';
        if (!next.productCode) next.productCode = template.code || '';
        setSpec(next);
      })
      .catch((err) => setError(err.message));
  }, [id]);

  async function handleSubmit(event) {
    event.preventDefault();
    const productName = spec.product.trim();
    if (!productName) {
      setError('Enter the product name.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const payload = {
        name: productName,
        code: spec.productCode,
        isActive,
        ...itemToPayload(spec),
      };
      if (isEdit) await salesSettingsApi.updateTemplate(id, payload);
      else await salesSettingsApi.createTemplate(payload);
      navigate('/sales-settings');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const title = spec.product.trim() || (isEdit ? 'Product' : 'Add product');

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-card px-3 py-2">
        <BackButton fallback="/sales-settings" />
        <h1 className="px-1 text-lg font-semibold">{title}</h1>
        <div className="ml-auto">
          <StatusToggle checked={isActive} disabled={!canSave} onChange={setIsActive} />
        </div>
      </div>

      <SalesOrderLineCard
        item={spec}
        index={0}
        hideTemplate
        showCommercial={can('sales:read')}
        canEdit={canSave}
        templates={templates.filter((template) => template.id !== id)}
        options={options}
        onChange={setSpec}
      />

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <div className="flex gap-2">
        {canSave ? (
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-dark disabled:opacity-60"
          >
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Save product'}
          </button>
        ) : null}
        <BackButton fallback="/sales-settings" label="Back to list" />
      </div>
    </form>
  );
}
