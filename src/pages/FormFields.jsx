import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { PageHeader } from '../components/ui/PageHeader';
import { refreshFieldRules } from '../hooks/useFieldRules';

// Owner only: which inputs must be filled on each form.
export function FormFields() {
  const [forms, setForms] = useState(null);
  const [changes, setChanges] = useState({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get('/api/form-fields')
      .then(setForms)
      .catch((err) => setError(err.message));
  }, []);

  const value = (form, f) => (changes[form.id]?.[f.key] ?? f.required);
  const toggle = (form, f) => {
    setNotice('');
    setChanges((c) => ({ ...c, [form.id]: { ...(c[form.id] || {}), [f.key]: !value(form, f) } }));
  };
  const count = Object.values(changes).reduce((s, v) => s + Object.keys(v).length, 0);

  async function save() {
    setSaving(true);
    setError('');
    try {
      setForms(await api.put('/api/form-fields', { required: changes }));
      setChanges({});
      await refreshFieldRules();
      setNotice('Saved. The forms show ✱ on the mandatory inputs from now on.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Form fields"
        subtitle="Choose which inputs must be filled. Inputs marked locked are always mandatory, because the app cannot work without them."
        actions={
          <button type="button" onClick={save} disabled={!count || saving} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {saving ? 'Saving…' : count ? `Save ${count} change${count > 1 ? 's' : ''}` : 'Saved'}
          </button>
        }
      />
      {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p> : null}
      {notice ? <p className="text-sm text-emerald-700">{notice}</p> : null}
      {!forms && !error ? <p className="text-sm text-slate">Loading…</p> : null}
      <div className="grid gap-4 xl:grid-cols-2">
        {(forms || []).map((form) => (
          <section key={form.id} className="space-y-2 rounded-xl border border-line bg-white p-4">
            <div>
              <h2 className="text-base font-semibold">{form.label}</h2>
              <p className="text-xs text-slate">{form.checkedOn}</p>
            </div>
            <ul className="divide-y divide-line">
              {form.fields.map((f) => {
                const on = value(form, f);
                const changed = changes[form.id]?.[f.key] !== undefined;
                return (
                  <li key={f.key} className="flex items-center justify-between gap-3 py-2">
                    <div>
                      <p className={`text-sm font-medium ${changed ? 'text-accent' : 'text-ink'}`}>{f.label}</p>
                      {f.whenLabel ? <p className="text-xs text-slate">When mandatory: {f.whenLabel}</p> : null}
                    </div>
                    {f.locked ? (
                      <span className="rounded-full bg-paper px-2.5 py-1 text-xs font-semibold text-slate">Always mandatory</span>
                    ) : (
                      <button
                        type="button"
                        role="switch"
                        aria-checked={on}
                        aria-label={`${f.label}: ${on ? 'mandatory' : 'optional'}`}
                        onClick={() => toggle(form, f)}
                        className={`min-w-28 rounded-full px-3 py-1 text-xs font-semibold ${on ? 'bg-red-700 text-white' : 'border border-line bg-white text-slate'}`}
                      >
                        {on ? 'Mandatory ✱' : 'Optional'}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
