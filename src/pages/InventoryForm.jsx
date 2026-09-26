import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { inventoryApi } from '../api/inventory.api';
import { BackButton } from '../components/ui/BackButton';
import { usePermission } from '../hooks/usePermission';

const inputClass = 'mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 outline-none focus:border-accent disabled:bg-paper';

const KIND_OPTIONS = [
  { id: 'raw', label: 'Raw', chip: 'border-sky-300 bg-sky-100 text-sky-800', dot: 'bg-sky-600' },
  { id: 'output', label: 'Output', chip: 'border-emerald-300 bg-emerald-100 text-emerald-800', dot: 'bg-emerald-600' },
  { id: 'waste', label: 'Waste', chip: 'border-amber-300 bg-amber-100 text-amber-900', dot: 'bg-amber-500' },
];

const STAGE_COLORS = {
  rolling: { chip: 'border-orange-300 bg-orange-100 text-orange-900', dot: 'bg-orange-600' },
  printing: { chip: 'border-sky-300 bg-sky-100 text-sky-800', dot: 'bg-sky-600' },
  cutting: { chip: 'border-violet-300 bg-violet-100 text-violet-800', dot: 'bg-violet-600' },
  dispatch: { chip: 'border-teal-300 bg-teal-100 text-teal-800', dot: 'bg-teal-600' },
  delivery: { chip: 'border-emerald-300 bg-emerald-100 text-emerald-800', dot: 'bg-emerald-600' },
  packing: { chip: 'border-violet-300 bg-violet-100 text-violet-800', dot: 'bg-violet-600' },
};

function Chevron({ open }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function KindMenu({ value, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  const current = KIND_OPTIONS.find((item) => item.id === value) || KIND_OPTIONS[0];

  useEffect(() => {
    if (!open) return undefined;
    function close() {
      setOpen(false);
    }
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [open]);

  return (
    <div className="relative mt-1" onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        aria-label="Kind"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((next) => !next)}
        className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60 ${current.chip}`}
      >
        <span className={`h-2 w-2 shrink-0 rounded-full ${current.dot}`} />
        <span className="flex-1">{current.label}</span>
        <Chevron open={open} />
      </button>
      {open ? (
        <div className="absolute left-0 right-0 z-20 mt-1 rounded-lg border border-line bg-white p-1 shadow-md">
          {KIND_OPTIONS.map((item) => (
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
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function StageMenuField({ stages, value, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  const current = stages.find((stage) => stage.id === value);
  const tone = STAGE_COLORS[current?.slug] || { chip: 'border-slate-300 bg-white text-ink', dot: 'bg-slate-500' };

  useEffect(() => {
    if (!open) return undefined;
    function close() {
      setOpen(false);
    }
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [open]);

  return (
    <div className="relative mt-1" onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        aria-label="Production stage"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((next) => !next)}
        className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60 ${tone.chip}`}
      >
        <span className={`h-2 w-2 shrink-0 rounded-full ${tone.dot}`} />
        <span className="min-w-0 flex-1 truncate">{current?.name || 'Choose a stage'}</span>
        <Chevron open={open} />
      </button>
      {open ? (
        <div className="absolute left-0 right-0 z-20 mt-1 max-h-64 overflow-auto rounded-lg border border-line bg-white p-1 shadow-md">
          {stages.map((stage) => {
            const itemTone = STAGE_COLORS[stage.slug] || tone;
            const selected = stage.id === value;
            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => {
                  onChange(stage.id);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm ${
                  selected ? itemTone.chip : 'text-ink hover:bg-paper'
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${itemTone.dot}`} />
                <span className="flex-1">{stage.name}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function FormBar({ title }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-card px-3 py-2">
      <BackButton fallback="/inventory" />
      <h1 className="px-1 text-lg font-semibold">{title}</h1>
    </div>
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
      <FormBar title={title} />

      <form onSubmit={handleSubmit} className="max-w-xl space-y-4 rounded-xl border border-line bg-card p-5">
        <label className="block text-base font-semibold text-ink">
          Kind
          <KindMenu value={form.category} disabled={!canSave} onChange={(category) => update('category', category)} />
        </label>

        <label className="block text-base font-semibold text-ink">
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

        <label className="block text-base font-semibold text-ink">
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
          <label className="block text-base font-semibold text-ink">
            Production stage
            <StageMenuField
              stages={stages}
              value={form.stageId}
              disabled={!canSave}
              onChange={(stageId) => update('stageId', stageId)}
            />
          </label>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-base font-semibold text-ink">
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
          <label className="block text-base font-semibold text-ink">
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
          <label className="block text-base font-semibold text-ink">
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

        <label className="block text-base font-semibold text-ink">
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
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-dark disabled:opacity-60"
            >
              {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Save material'}
            </button>
          ) : null}
          <BackButton fallback="/inventory" label="Back to list" />
          {isEdit && can('inventory:delete') ? (
            <button
              type="button"
              title="Delete material"
              aria-label="Delete material"
              onClick={handleDelete}
              className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-white text-red-700 hover:bg-red-50"
            >
              <TrashIcon />
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
