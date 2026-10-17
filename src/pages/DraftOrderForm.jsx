import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { intakeApi } from '../api/intake.api';
import { Field, Section, inputClass } from '../components/ui/FormField';
import { PageHeader } from '../components/ui/PageHeader';
import { useLeaveGuard } from '../hooks/useLeaveGuard';
import { emptyProposal, toPayload } from '../lib/intakeProposal';
import { DraftOrderProposalEditor } from './DraftOrderProposalEditor';

// A draft taken on the phone or at the counter: either let the reader fill it
// from a pasted message / photo, or type it. Review happens on the draft page.
export function DraftOrderForm() {
  const navigate = useNavigate();
  const [proposal, setProposal] = useState(emptyProposal);
  const [typed, setTyped] = useState(false);
  const [text, setText] = useState('');
  const [files, setFiles] = useState([]);
  const [sender, setSender] = useState({ name: '', phone: '', email: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  useLeaveGuard((typed || Boolean(text.trim()) || files.length > 0) && !busy);

  async function readWithAi() {
    setBusy('read');
    setError('');
    try {
      const form = new FormData();
      form.append('text', text);
      form.append('senderName', sender.name);
      form.append('senderPhone', sender.phone);
      form.append('senderEmail', sender.email);
      for (const file of files) form.append('files', file);
      const draft = await intakeApi.readPanel(form);
      navigate(`/draft-orders/${draft.id}`, { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy('');
    }
  }

  async function save(event) {
    event.preventDefault();
    setBusy('save');
    setError('');
    try {
      const draft = await intakeApi.createPanel({ proposal: toPayload(proposal), sender });
      navigate(`/draft-orders/${draft.id}`, { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy('');
    }
  }

  const setSenderField = (key) => (event) => setSender((current) => ({ ...current, [key]: event.target.value }));

  return (
    <form onSubmit={save} className="space-y-4">
      <PageHeader title="New draft" subtitle="An order from a call, a visit, or a message forwarded by hand." backTo="/draft-orders" backLabel="Draft orders" />
      {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p> : null}

      <Section title="Who sent it (optional)">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Name">
            <input className={inputClass} value={sender.name} onChange={setSenderField('name')} />
          </Field>
          <Field label="Mobile">
            <input className={inputClass} value={sender.phone} onChange={setSenderField('phone')} inputMode="tel" />
          </Field>
          <Field label="Email">
            <input className={inputClass} value={sender.email} onChange={setSenderField('email')} type="email" />
          </Field>
        </div>
      </Section>

      <Section title="Let the reader fill it">
        <Field label="Paste the message">
          <textarea
            className={`${inputClass} min-h-28`}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Please share the PI against 17000 Polly bag (10*14*2)"
          />
        </Field>
        <Field label="Photo or PDF (up to 5)">
          <input type="file" multiple accept="image/*,application/pdf" className={inputClass} onChange={(event) => setFiles(Array.from(event.target.files || []).slice(0, 5))} />
        </Field>
        <button
          type="button"
          onClick={readWithAi}
          disabled={Boolean(busy) || (!text.trim() && !files.length)}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-dark disabled:opacity-60"
        >
          {busy === 'read' ? 'Reading…' : 'Read and open the draft'}
        </button>
      </Section>

      <Section title="Or type it">
        <DraftOrderProposalEditor
          value={proposal}
          onChange={(next) => {
            setProposal(next);
            setTyped(true);
          }}
          disabled={Boolean(busy)}
        />
        <div className="flex items-center gap-3">
          <button type="submit" disabled={Boolean(busy) || !typed} className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold disabled:opacity-60">
            {busy === 'save' ? 'Saving…' : 'Save typed draft'}
          </button>
          <Link to="/draft-orders" className="text-sm font-semibold text-slate">
            Cancel
          </Link>
        </div>
      </Section>
    </form>
  );
}
