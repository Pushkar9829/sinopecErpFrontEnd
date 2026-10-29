import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { documentLayoutsApi } from '../api/documentLayouts.api';
import { confirmAction } from '../components/ui/confirm';
import { PageHeader } from '../components/ui/PageHeader';
import { forgetLayouts } from '../lib/documentLayout';

// Owner: what each printed document and PDF shows — header fields, table
// columns and page parts (show / hide, rename, reorder), added fields, title
// and a footer note.

const box = 'w-full rounded-lg border border-line bg-white px-2.5 py-1.5 text-sm focus:border-accent focus:outline-none';
const small = 'rounded-md border border-line bg-white px-2 py-1 text-xs font-semibold hover:bg-paper disabled:opacity-30';

function move(list, index, by) {
  const next = [...list];
  const to = index + by;
  if (to < 0 || to >= next.length) return list;
  [next[index], next[to]] = [next[to], next[index]];
  return next;
}

function PartList({ title, hint, parts, onChange, orderLinked, canAdd }) {
  const [adding, setAdding] = useState({ label: '', source: 'fixed', text: '' });
  const set = (index, patch) => onChange(parts.map((p, i) => (i === index ? { ...p, ...patch } : p)));

  function add() {
    if (!adding.label.trim()) return;
    onChange([...parts, { key: '', label: adding.label.trim(), show: true, custom: true, source: adding.source, text: adding.source === 'fixed' ? adding.text : '' }]);
    setAdding({ label: '', source: 'fixed', text: '' });
  }

  return (
    <section className="space-y-2 rounded-xl border border-line bg-white p-4">
      <div>
        <h3 className="text-base font-semibold">{title}</h3>
        {hint ? <p className="text-xs text-slate">{hint}</p> : null}
      </div>
      <ul className="divide-y divide-line">
        {parts.map((p, index) => (
          <li key={p.key || `new-${index}`} className="flex flex-wrap items-center gap-2 py-2">
            <input type="checkbox" checked={p.show} onChange={(e) => set(index, { show: e.target.checked })} className="h-4 w-4 accent-accent" aria-label={`Show ${p.label}`} />
            <input value={p.label} onChange={(e) => set(index, { label: e.target.value })} className={`${box} max-w-xs flex-1 ${p.show ? '' : 'text-slate line-through'}`} />
            {p.custom ? (
              <span className="rounded-full bg-paper px-2 py-0.5 text-xs text-slate">{p.source === 'order' ? 'Filled on each order' : 'Fixed text'}</span>
            ) : p.defaultLabel && p.label !== p.defaultLabel ? (
              <button type="button" onClick={() => set(index, { label: p.defaultLabel })} className="text-xs text-accent">
                Reset name ({p.defaultLabel})
              </button>
            ) : null}
            <span className="ml-auto flex gap-1">
              <button type="button" className={small} disabled={index === 0} onClick={() => onChange(move(parts, index, -1))} aria-label="Move up">
                ↑
              </button>
              <button type="button" className={small} disabled={index === parts.length - 1} onClick={() => onChange(move(parts, index, 1))} aria-label="Move down">
                ↓
              </button>
              {p.custom ? (
                <button type="button" className={`${small} text-rose-800`} onClick={() => onChange(parts.filter((_, i) => i !== index))}>
                  Remove
                </button>
              ) : null}
            </span>
            {p.custom && p.source === 'fixed' ? (
              <textarea rows={2} value={p.text} onChange={(e) => set(index, { text: e.target.value })} placeholder="Text printed on every copy" className={`${box} basis-full`} />
            ) : null}
          </li>
        ))}
      </ul>
      {canAdd ? (
        <div className="space-y-2 rounded-lg bg-paper p-3">
          <p className="text-sm font-semibold">Add a field</p>
          <div className="flex flex-wrap gap-2">
            <input value={adding.label} onChange={(e) => setAdding({ ...adding, label: e.target.value })} placeholder="Name, e.g. Brand or Vehicle no." className={`${box} max-w-xs`} />
            <select value={adding.source} onChange={(e) => setAdding({ ...adding, source: e.target.value })} className={`${box} max-w-[14rem]`}>
              <option value="fixed">Fixed text (same on every copy)</option>
              {orderLinked ? <option value="order">Filled on each order</option> : null}
            </select>
            <button type="button" onClick={add} disabled={!adding.label.trim()} className="rounded-lg bg-ink px-3 py-1.5 text-sm font-semibold text-paper disabled:opacity-40">
              Add
            </button>
          </div>
          {adding.source === 'fixed' ? (
            <textarea rows={2} value={adding.text} onChange={(e) => setAdding({ ...adding, text: e.target.value })} placeholder="Text printed on every copy" className={box} />
          ) : (
            <p className="text-xs text-slate">A box with this name appears on the order form (Delivery step); what is typed there prints here.</p>
          )}
        </div>
      ) : null}
    </section>
  );
}

export function DocumentLayouts() {
  const [params, setParams] = useSearchParams();
  const [layouts, setLayouts] = useState(null);
  // Unsaved edits belong to the layout they were made on; a new layout (another
  // document, or the saved copy) starts clean.
  const [edits, setEdits] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const selected = params.get('doc') || 'salesOrder';

  useEffect(() => {
    documentLayoutsApi
      .list()
      .then(setLayouts)
      .catch((err) => setError(err.message));
  }, []);

  const current = useMemo(() => layouts?.find((l) => l.id === selected) || layouts?.[0] || null, [layouts, selected]);
  const draft = edits?.base === current ? edits.value : current;
  const setDraft = (value) => setEdits({ base: current, value });

  const dirty = draft && current && JSON.stringify(draft) !== JSON.stringify(current);
  const groups = useMemo(() => {
    const out = new Map();
    for (const l of layouts || []) out.set(l.group, [...(out.get(l.group) || []), l]);
    return [...out.entries()];
  }, [layouts]);

  async function choose(id) {
    if (dirty && !(await confirmAction({ title: 'Leave without saving?', message: 'Your changes to this document are not saved.', confirmLabel: 'Leave', danger: true }))) return;
    setNotice('');
    setParams({ doc: id }, { replace: true });
  }

  function replace(next) {
    setLayouts((all) => all.map((l) => (l.id === next.id ? next : l)));
    forgetLayouts();
  }

  async function save() {
    setSaving(true);
    setError('');
    try {
      const strip = (parts) => parts.map(({ key, label, show, custom, source, text }) => ({ key, label, show, custom, source, text }));
      const saved = await documentLayoutsApi.save(draft.id, {
        title: draft.title === draft.defaultTitle ? '' : draft.title,
        footerNote: draft.footerNote,
        fields: strip(draft.fields),
        columns: strip(draft.columns),
        blocks: strip(draft.blocks),
      });
      replace(saved);
      setNotice('Saved. Every copy printed from now on uses this layout.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function reset() {
    if (!(await confirmAction({ title: `Reset ${draft.label}?`, message: 'All fields, columns and names go back to how the app first printed them. Added fields are removed.', confirmLabel: 'Reset', danger: true }))) return;
    try {
      replace(await documentLayoutsApi.reset(draft.id));
      setNotice('Back to the default layout.');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Documents"
        subtitle="Choose what every printed document and PDF shows: add or remove fields, table columns and parts of the page, rename them and change their order."
        actions={
          draft ? (
            <div className="flex gap-2">
              <button type="button" onClick={reset} disabled={!draft.changed} className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold disabled:opacity-40">
                Reset to default
              </button>
              <button type="button" onClick={save} disabled={!dirty || saving} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
              </button>
            </div>
          ) : null
        }
      />
      {error ? <p className="whitespace-pre-line rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p> : null}
      {notice ? <p className="text-sm text-emerald-700">{notice}</p> : null}
      {!layouts && !error ? <p className="text-sm text-slate">Loading…</p> : null}

      {draft ? (
        <div className="grid gap-4 lg:grid-cols-[15rem_1fr]">
          <nav className="space-y-3">
            {groups.map(([group, docs]) => (
              <div key={group}>
                <p className="px-2 text-xs font-semibold uppercase tracking-wide text-slate">{group}</p>
                {docs.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => choose(l.id)}
                    className={`block w-full rounded-lg px-2 py-1.5 text-left text-sm ${l.id === draft.id ? 'bg-ink text-paper' : 'hover:bg-white'}`}
                  >
                    {l.label}
                    {l.changed ? <span className={`ml-1 text-xs ${l.id === draft.id ? 'text-paper/70' : 'text-accent'}`}>· changed</span> : null}
                  </button>
                ))}
              </div>
            ))}
          </nav>

          <div className="space-y-4">
            {draft.id !== 'tableExport' ? (
              <section className="grid gap-3 rounded-xl border border-line bg-white p-4 sm:grid-cols-2">
                <label className="text-sm font-semibold">
                  Title printed on top
                  <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder={draft.defaultTitle} className={`${box} mt-1`} />
                </label>
                <p className="self-end text-xs text-slate">{draft.orderLinked ? 'Made from an order: added fields can be filled on each order.' : 'Added fields on this document are fixed text.'}</p>
              </section>
            ) : null}
            {draft.fields.length || draft.id !== 'tableExport' ? (
              <PartList
                title="Fields at the top"
                hint="Tick to show. Fields with nothing to print are left out on that copy."
                parts={draft.fields}
                onChange={(fields) => setDraft({ ...draft, fields })}
                orderLinked={draft.orderLinked}
                canAdd
              />
            ) : null}
            {draft.columns.length ? <PartList title="Table columns" hint="Left to right in this order." parts={draft.columns} onChange={(columns) => setDraft({ ...draft, columns })} /> : null}
            <PartList title="Parts of the page" hint="Untick to leave a part off the page; rename to change its heading." parts={draft.blocks} onChange={(blocks) => setDraft({ ...draft, blocks })} />
            <section className="rounded-xl border border-line bg-white p-4">
              <label className="text-sm font-semibold">
                Note at the bottom <span className="font-normal text-slate">(optional, printed on every copy)</span>
                <textarea rows={2} value={draft.footerNote} onChange={(e) => setDraft({ ...draft, footerNote: e.target.value })} className={`${box} mt-1`} />
              </label>
            </section>
          </div>
        </div>
      ) : null}
    </div>
  );
}
