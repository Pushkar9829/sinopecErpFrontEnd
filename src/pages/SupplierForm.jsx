import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { suppliersApi } from '../api/suppliers.api';
import { confirmAction } from '../components/ui/confirm';
import { Field, Grid, Section, inputClass } from '../components/ui/FormField';
import { PageHeader } from '../components/ui/PageHeader';
import { useUnsavedChanges } from '../hooks/useUnsavedChanges';
import { usePermission } from '../hooks/usePermission';

const EMPTY = { name: '', gstNumber: '', contactPerson: '', mobile: '', email: '', address: '', materials: '', notes: '', isActive: true };

export function SupplierForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { can } = usePermission();
  const canSave = can(isEdit ? 'inventory:update' : 'inventory:create');
  const [form, setForm] = useState(EMPTY);
  const [code, setCode] = useState('');
  const [loaded, setLoaded] = useState(!isEdit);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const { markSaved } = useUnsavedChanges(form, loaded);

  useEffect(() => {
    if (!isEdit) return undefined;
    let alive = true;
    suppliersApi
      .get(id)
      .then((s) => {
        if (!alive) return;
        setForm(Object.fromEntries(Object.keys(EMPTY).map((key) => [key, s[key] ?? EMPTY[key]])));
        setCode(s.code);
        setLoaded(true);
      })
      .catch((err) => alive && setError(err.message));
    return () => {
      alive = false;
    };
  }, [id, isEdit]);

  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }));

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (isEdit) await suppliersApi.update(id, form);
      else await suppliersApi.create(form);
      markSaved();
      navigate('/suppliers');
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  async function remove() {
    const yes = await confirmAction({ title: `Delete ${form.name}`, message: 'A supplier used on stock lots cannot be deleted; mark it inactive instead.', confirmLabel: 'Delete', danger: true });
    if (!yes) return;
    try {
      await suppliersApi.remove(id);
      markSaved();
      navigate('/suppliers');
    } catch (err) {
      setError(err.message);
    }
  }

  if (!loaded && !error) return <p className="text-sm text-slate">Loading supplier…</p>;

  return (
    <form onSubmit={save} className="space-y-4">
      <PageHeader title={isEdit ? form.name || 'Supplier' : 'New supplier'} subtitle={code} backTo="/suppliers" backLabel="Suppliers" />
      {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p> : null}
      <Section title="Supplier">
        <Grid>
          <Field label="Name" mark>
            <input required value={form.name} disabled={!canSave} onChange={set('name')} className={inputClass} />
          </Field>
          <Field label="GST number">
            <input value={form.gstNumber} disabled={!canSave} onChange={set('gstNumber')} className={inputClass} placeholder="07ABCDE1234F1Z5" />
          </Field>
          <Field label="Contact person">
            <input value={form.contactPerson} disabled={!canSave} onChange={set('contactPerson')} className={inputClass} />
          </Field>
          <Field label="Mobile">
            <input value={form.mobile} disabled={!canSave} onChange={set('mobile')} className={inputClass} inputMode="tel" />
          </Field>
          <Field label="Email">
            <input type="email" value={form.email} disabled={!canSave} onChange={set('email')} className={inputClass} />
          </Field>
          <Field label="What they supply">
            <input value={form.materials} disabled={!canSave} onChange={set('materials')} className={inputClass} placeholder="LDPE granules, ink, cartons" />
          </Field>
        </Grid>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Address">
            <textarea rows={3} value={form.address} disabled={!canSave} onChange={set('address')} className={inputClass} />
          </Field>
          <Field label="Notes">
            <textarea rows={3} value={form.notes} disabled={!canSave} onChange={set('notes')} className={inputClass} />
          </Field>
        </div>
        {isEdit ? (
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={form.isActive} disabled={!canSave} onChange={set('isActive')} />
            Active (shown when receiving material)
          </label>
        ) : null}
      </Section>
      {canSave ? (
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={saving} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-dark disabled:opacity-60">
            {saving ? 'Saving…' : 'Save supplier'}
          </button>
          {isEdit && can('inventory:delete') ? (
            <button type="button" onClick={remove} className="rounded-lg border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-800">
              Delete
            </button>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
