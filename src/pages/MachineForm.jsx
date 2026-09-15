import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { machinesApi } from '../api/machines.api';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusToggle } from '../components/ui/StatusToggle';
import { usePermission } from '../hooks/usePermission';

const inputClass = 'mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 outline-none focus:border-accent disabled:bg-paper';

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
      <PageHeader
        title={isEdit ? form.name || 'Machine' : 'Add machine'}
        subtitle="Give the machine a name and optional shop-floor code."
        backTo="/machines"
        backLabel="Machines"
      />

      <form onSubmit={handleSubmit} className="max-w-xl space-y-4 rounded-xl border border-line bg-card p-5">
        <label className="block text-sm text-slate">
          Name
          <input required disabled={!canSave} value={form.name} onChange={(event) => update('name', event.target.value)} className={inputClass} />
        </label>
        <label className="block text-sm text-slate">
          Code
          <input disabled={!canSave} value={form.code} onChange={(event) => update('code', event.target.value)} placeholder="RM-01" className={inputClass} />
        </label>
        <label className="block text-sm text-slate">
          Notes
          <textarea disabled={!canSave} rows={3} value={form.notes} onChange={(event) => update('notes', event.target.value)} className={inputClass} />
        </label>
        <div className="flex items-center justify-between rounded-lg border border-line px-3 py-2">
          <span className="text-sm text-slate">Active</span>
          <StatusToggle checked={form.isActive} disabled={!canSave} onChange={(isActive) => update('isActive', isActive)} />
        </div>

        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        {notice ? <p className="text-sm text-emerald-700">{notice}</p> : null}

        <div className="flex flex-wrap gap-2">
          {canSave ? (
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-accent px-4 py-2 font-medium text-white hover:bg-accent-dark disabled:opacity-60"
            >
              {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Save machine'}
            </button>
          ) : null}
          <button type="button" onClick={() => navigate('/machines')} className="rounded-lg border border-line px-4 py-2">
            Back to list
          </button>
          {isEdit && (can('production:delete') || can('inventory:delete')) ? (
            <button type="button" onClick={handleDelete} className="ml-auto px-4 py-2 text-red-700 hover:underline">
              Delete
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
