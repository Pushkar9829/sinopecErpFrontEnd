import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { intakeApi } from '../api/intake.api';
import { Field, Section, inputClass } from '../components/ui/FormField';
import { PageHeader } from '../components/ui/PageHeader';
import { DraftOrderProposalEditor, emptyProposal, toEditable, toPayload } from './DraftOrderProposalEditor';

export function DraftOrderForm() {
  const navigate = useNavigate();
  const [proposal, setProposal] = useState(emptyProposal);
  const [text, setText] = useState('');
  const [files, setFiles] = useState([]);
  const [draftId, setDraftId] = useState('');
  const [warnings, setWarnings] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  async function readWithAi() {
    setBusy('read');
    setError('');
    try {
      let draft;
      if (draftId) {
        draft = await intakeApi.reread(draftId);
      } else {
        const form = new FormData();
        form.append('text', text);
        for (const file of files) form.append('files', file);
        draft = await intakeApi.readPanel(form);
      }
      setDraftId(draft.id);
      setProposal(toEditable(draft.proposal));
      setWarnings(draft.warnings || []);
      if (draft.error) setError(`${draft.error} You can still type the order and save it.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  }

  async function save(event) {
    event.preventDefault();
    setBusy('save');
    setError('');
    try {
      const payload = toPayload(proposal);
      const draft = draftId ? await intakeApi.saveProposal(draftId, payload) : await intakeApi.createPanel({ proposal: payload });
      navigate(`/draft-orders/${draft.id}`);
    } catch (err) {
      setError(err.message);
      setBusy('');
    }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <PageHeader
        title="New draft"
        subtitle="Take an order from a call, a visit, or a message. It is saved as a draft in this tab only."
        backTo="/draft-orders"
        backLabel="Draft orders"
      />
      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <Section title="Read with AI (optional)">
        <Field label="Paste a message">
          <textarea
            className={`${inputClass} min-h-28`}
            value={text}
            disabled={Boolean(draftId)}
            onChange={(event) => setText(event.target.value)}
            placeholder="Please share the PI against 17000 Polly bag (10*14*2)"
          />
        </Field>
        <Field label="Photo or PDF">
          <input
            type="file"
            multiple
            accept="image/*,application/pdf"
            className={inputClass}
            disabled={Boolean(draftId)}
            onChange={(event) => setFiles(Array.from(event.target.files || []).slice(0, 5))}
          />
        </Field>
        <button
          type="button"
          onClick={readWithAi}
          disabled={Boolean(busy) || (!draftId && !text.trim() && !files.length)}
          className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold disabled:opacity-60"
        >
          {busy === 'read' ? 'Reading…' : draftId ? 'Read the same message again' : 'Fill the form with AI'}
        </button>
        {draftId ? <p className="text-sm text-slate">The message and files are kept with this draft. Check the fields below before saving.</p> : null}
        {warnings.length ? (
          <ul className="list-disc space-y-1 rounded-lg bg-amber-50 px-6 py-3 text-sm text-amber-950">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        ) : null}
      </Section>

      <Section title="Order details">
        <DraftOrderProposalEditor value={proposal} onChange={setProposal} disabled={busy === 'read'} />
      </Section>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={Boolean(busy)} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-dark disabled:opacity-60">
          {busy === 'save' ? 'Saving…' : 'Save draft'}
        </button>
        <Link to="/draft-orders" className="text-sm font-semibold text-slate">
          Cancel
        </Link>
      </div>
    </form>
  );
}
