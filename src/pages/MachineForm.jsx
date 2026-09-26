import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { machinesApi } from '../api/machines.api';
import { BackButton } from '../components/ui/BackButton';
import { StatusToggle } from '../components/ui/StatusToggle';
import { usePermission } from '../hooks/usePermission';

const inputClass = 'mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 outline-none focus:border-accent disabled:bg-paper';

function FormBar({ title }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-card px-3 py-2">
      <BackButton fallback="/machines" />
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

export function MachineForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = usePermission();
  const isEdit = Boolean(id);
  const canSave = isEdit
    ? can('production:update') || can('inventory:update')
    : can('production:create') || can('inventory:create');
  const [form, setForm] = useState({ name: '', code: '', notes: '', isActive: true });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    machinesApi
      .get(id)
      .then((machine) => {
        setForm({
          name: machine.name,
          code: machine.code || '',
          notes: machine.notes || '',
          isActive: machine.isActive,
        });
      })
      .catch((err) => setError(err.message));
  }, [id]);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!canSave) return;
    setError('');
    setNotice('');
    setSaving(true);
    try {
      if (isEdit) {
        await machinesApi.update(id, form);
        setNotice('Saved.');
      } else {
        await machinesApi.create(form);
        navigate('/machines');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this machine?')) return;
    try {
      await machinesApi.remove(id);
      navigate('/machines');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="space-y-5">
      <FormBar title={isEdit ? form.name || 'Machine' : 'Add machine'} />

      <form onSubmit={handleSubmit} className="max-w-xl space-y-4 rounded-xl border border-line bg-card p-5">
        <label className="block text-base font-semibold text-ink">
          Name
          <input required disabled={!canSave} value={form.name} onChange={(event) => update('name', event.target.value)} className={inputClass} />
        </label>
        <label className="block text-base font-semibold text-ink">
          Code
          <input disabled={!canSave} value={form.code} onChange={(event) => update('code', event.target.value)} placeholder="RM-01" className={inputClass} />
        </label>
        <label className="block text-base font-semibold text-ink">
          Notes
          <textarea disabled={!canSave} rows={3} value={form.notes} onChange={(event) => update('notes', event.target.value)} className={inputClass} />
        </label>
        <div className="flex items-center justify-between rounded-lg border border-line px-3 py-2">
          <span className="text-base font-semibold text-ink">Status</span>
          <StatusToggle checked={form.isActive} disabled={!canSave} onChange={(isActive) => update('isActive', isActive)} />
        </div>

        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        {notice ? <p className="text-sm text-emerald-700">{notice}</p> : null}

        <div className="flex flex-wrap gap-2">
          {canSave ? (
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-dark disabled:opacity-60"
            >
              {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Save machine'}
            </button>
          ) : null}
          <BackButton fallback="/machines" label="Back to list" />
          {isEdit && (can('production:delete') || can('inventory:delete')) ? (
            <button
              type="button"
              title="Delete machine"
              aria-label="Delete machine"
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
