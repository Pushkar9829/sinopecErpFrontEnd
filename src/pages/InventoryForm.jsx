import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { inventoryApi } from '../api/inventory.api';
import { PageHeader } from '../components/ui/PageHeader';
import { usePermission } from '../hooks/usePermission';

const inputClass = 'mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 outline-none focus:border-accent disabled:bg-paper';

const UNIT_PRESETS = ['kg', 'g', 'm', 'mm', 'cm', 'litre', 'ml', 'pcs', 'roll', 'sheet'];

const emptyForm = {
  category: 'raw',
  name: '',
  materialType: '',
  unit: 'kg',
  quantity: '',
  unitPrice: '',
  stageId: '',
  notes: '',
};

export function InventoryForm() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { can } = usePermission();
  const isEdit = Boolean(id);
  const canSave = isEdit ? can('inventory:update') : can('inventory:create');

  const [stages, setStages] = useState([]);
  const [meta, setMeta] = useState({ materialTypes: [], units: [] });
  const [form, setForm] = useState({
    ...emptyForm,
    category: searchParams.get('category') || 'raw',
  });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  const needsStage = form.category === 'output' || form.category === 'waste';
  const hidePrice = form.category === 'waste';

  useEffect(() => {
    Promise.all([inventoryApi.listStages(), inventoryApi.meta().catch(() => ({ materialTypes: [], units: [] }))])
      .then(([nextStages, nextMeta]) => {
        setStages(nextStages);
        setMeta(nextMeta);
        setForm((prev) => ({
          ...prev,
          stageId: prev.stageId || nextStages[0]?.id || '',
        }));
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!id) return;
    inventoryApi
      .getItem(id)
      .then((item) => {
        setForm({
          category: item.category,
          name: item.name,
          materialType: item.materialType,
          unit: item.unit,
          quantity: String(item.quantity ?? ''),
          unitPrice: item.unitPrice == null ? '' : String(item.unitPrice),
          stageId: item.stage?.id || '',
          notes: item.notes || '',
        });
      })
      .catch((err) => setError(err.message));
  }, [id]);

  const typeOptions = useMemo(() => {
    const extra = form.materialType ? [form.materialType] : [];
    return [...new Set([...meta.materialTypes, ...extra])];
  }, [meta.materialTypes, form.materialType]);

  const unitOptions = useMemo(() => [...new Set([...UNIT_PRESETS, ...meta.units, form.unit].filter(Boolean))], [meta.units, form.unit]);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!canSave) return;
    setError('');
    setNotice('');
    setSaving(true);

    const payload = {
      category: form.category,
      name: form.name,
      materialType: form.materialType,
      unit: form.unit,
      quantity: Number(form.quantity),
      notes: form.notes,
      stageId: needsStage ? form.stageId : null,
      unitPrice: hidePrice ? null : Number(form.unitPrice),
    };

    try {
      if (isEdit) {
        await inventoryApi.updateItem(id, payload);
        setNotice('Saved.');
      } else {
        await inventoryApi.createItem(payload);
        navigate('/inventory');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this material?')) return;
    try {
      await inventoryApi.removeItem(id);
      navigate('/inventory');
    } catch (err) {
      setError(err.message);
    }
  }

  const title = isEdit ? form.name || 'Material' : 'Add material';

  return (
    <div className="space-y-5">
      <PageHeader
        title={title}
        subtitle={
          hidePrice
            ? 'Waste is stored by type, unit, and quantity. No price.'
            : 'Type, unit, and price are free-form. Use kg, meter, or any other metric.'
        }
        backTo="/inventory"
        backLabel="Inventory"
      />

      <form onSubmit={handleSubmit} className="max-w-xl space-y-4 rounded-xl border border-line bg-card p-5">
        <div>
          <p className="text-sm text-slate">Kind</p>
          <div className="mt-1 grid grid-cols-3 gap-1 rounded-lg bg-paper p-1">
            {[
              { id: 'raw', label: 'Raw' },
              { id: 'output', label: 'Output' },
              { id: 'waste', label: 'Waste' },
            ].map((option) => (
              <button
                key={option.id}
                type="button"
                disabled={!canSave}
                onClick={() => update('category', option.id)}
                className={`rounded-md px-3 py-1.5 text-sm ${
                  form.category === option.id ? 'bg-ink text-paper' : 'text-slate hover:bg-white'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <label className="block text-sm text-slate">
          Name
          <input
            required
            disabled={!canSave}
            value={form.name}
            onChange={(event) => update('name', event.target.value)}
            placeholder="HDPE granules, rolled film…"
            className={inputClass}
          />
        </label>

        <label className="block text-sm text-slate">
          Type
          <input
            required
            disabled={!canSave}
            list="material-types"
            value={form.materialType}
            onChange={(event) => update('materialType', event.target.value)}
            placeholder="Polymer, ink, film, or any type"
            className={inputClass}
          />
          <datalist id="material-types">
            {typeOptions.map((type) => (
              <option key={type} value={type} />
            ))}
          </datalist>
        </label>

        {needsStage ? (
          <label className="block text-sm text-slate">
            Production stage
            <select
              required
              disabled={!canSave}
              value={form.stageId}
              onChange={(event) => update('stageId', event.target.value)}
              className={inputClass}
            >
              {stages.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm text-slate">
            Quantity
            <input
              required
              disabled={!canSave}
              type="number"
              min="0"
              step="any"
              value={form.quantity}
              onChange={(event) => update('quantity', event.target.value)}
              className={inputClass}
            />
          </label>
          <label className="block text-sm text-slate">
            Unit
            <input
              required
              disabled={!canSave}
              list="material-units"
              value={form.unit}
              onChange={(event) => update('unit', event.target.value)}
              placeholder="kg, m, litre…"
              className={inputClass}
            />
            <datalist id="material-units">
              {unitOptions.map((unit) => (
                <option key={unit} value={unit} />
              ))}
            </datalist>
          </label>
        </div>

        {hidePrice ? (
          <p className="rounded-lg bg-paper px-3 py-2 text-sm text-slate">Waste has no unit price.</p>
        ) : (
          <label className="block text-sm text-slate">
            Unit price
            <input
              required
              disabled={!canSave}
              type="number"
              min="0"
              step="any"
              value={form.unitPrice}
              onChange={(event) => update('unitPrice', event.target.value)}
              className={inputClass}
            />
          </label>
        )}

        <label className="block text-sm text-slate">
          Notes
          <textarea
            disabled={!canSave}
            rows={3}
            value={form.notes}
            onChange={(event) => update('notes', event.target.value)}
            className={inputClass}
          />
        </label>

        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        {notice ? <p className="text-sm text-emerald-700">{notice}</p> : null}

        <div className="flex flex-wrap gap-2">
          {canSave ? (
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-accent px-4 py-2 font-medium text-white hover:bg-accent-dark disabled:opacity-60"
            >
              {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Save material'}
            </button>
          ) : null}
          <button type="button" onClick={() => navigate('/inventory')} className="rounded-lg border border-line px-4 py-2">
            Back to list
          </button>
          {isEdit && can('inventory:delete') ? (
            <button type="button" onClick={handleDelete} className="ml-auto px-4 py-2 text-red-700 hover:underline">
              Delete
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
