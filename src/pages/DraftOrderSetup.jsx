import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { intakeApi } from '../api/intake.api';
import { confirmAction } from '../components/ui/confirm';
import { Field, Section, inputClass } from '../components/ui/FormField';
import { PageHeader } from '../components/ui/PageHeader';
import { useLeaveGuard } from '../hooks/useLeaveGuard';

const SECRET_FIELDS = ['whatsappAppSecret', 'whatsappAccessToken', 'gmailClientSecret', 'geminiApiKey', 'claudeApiKey', 'openaiApiKey'];
const TEXT_FIELDS = [
  'publicBaseUrl',
  'whatsappVerifyToken',
  'whatsappPhoneNumberId',
  'gmailClientId',
  'orderKeywords',
  'aiProvider',
  'aiFallbackProvider',
  'geminiModel',
  'claudeModel',
  'openaiBaseUrl',
  'openaiModel',
  'autoReplyTestRecipients',
  'autoReplyText',
];
const NUMBER_FIELDS = ['whatsappWindowMinutes', 'dailyReadLimit', 'autoReplyDailyPerSender', 'retentionDays', 'reviewSlaHours'];
const PROVIDERS = [
  ['gemini', 'Google Gemini'],
  ['claude', 'Anthropic Claude'],
  ['openai', 'Open model (Ollama, vLLM, or any OpenAI-compatible server)'],
];

function formFrom(data) {
  const form = { autoReplyEnabled: Boolean(data.autoReplyEnabled), autoReplyTestMode: data.autoReplyTestMode !== false };
  for (const key of TEXT_FIELDS) form[key] = data[key] || '';
  for (const key of NUMBER_FIELDS) form[key] = data[key] ?? '';
  for (const key of SECRET_FIELDS) form[key] = '';
  return form;
}

function SecretInput({ label, name, form, saved, set }) {
  return (
    <Field label={label}>
      <input
        className={inputClass}
        type="password"
        autoComplete="off"
        value={form[name]}
        onChange={(event) => set(name, event.target.value)}
        placeholder={saved?.[`${name}Set`] ? 'Saved. Type a new value to replace it.' : 'Not set'}
      />
    </Field>
  );
}

export function DraftOrderSetup() {
  const [params] = useSearchParams();
  const [form, setForm] = useState(null);
  const [saved, setSaved] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState(() => (params.get('gmail') === 'error' ? params.get('message') || 'Gmail connection failed' : ''));
  const [notice, setNotice] = useState(() => (params.get('gmail') === 'connected' ? 'Gmail is connected.' : ''));
  const [saving, setSaving] = useState(false);
  useLeaveGuard(dirty);

  useEffect(() => {
    let alive = true;
    intakeApi
      .settings()
      .then((data) => {
        if (!alive) return;
        setSaved(data);
        setForm(formFrom(data));
      })
      .catch((err) => alive && setError(err.message));
    return () => {
      alive = false;
    };
  }, []);

  function set(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setDirty(true);
  }

  async function onSave(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const data = await intakeApi.saveSettings(form);
      setSaved((current) => ({ ...current, ...data }));
      setForm(formFrom(data));
      setDirty(false);
      setNotice('Setup saved.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function connectGmail() {
    setError('');
    if (dirty) {
      setError('Save the setup first, then connect Gmail.');
      return;
    }
    try {
      const data = await intakeApi.gmailStart();
      window.location.assign(data.url);
    } catch (err) {
      setError(err.message);
    }
  }

  async function disconnectGmail() {
    const yes = await confirmAction({ title: 'Disconnect Gmail', message: 'New mail stops coming in. Drafts already read are kept.', confirmLabel: 'Disconnect', danger: true });
    if (!yes) return;
    try {
      const data = await intakeApi.gmailDisconnect();
      setSaved(data);
      setNotice('Gmail disconnected.');
    } catch (err) {
      setError(err.message);
    }
  }

  async function copy(text, label) {
    try {
      await navigator.clipboard.writeText(text);
      setNotice(`${label} copied.`);
    } catch {
      setError('Copy failed; select the address and copy it by hand.');
    }
  }

  if (!form) return <p className="text-sm text-slate">{error || 'Loading setup…'}</p>;
  const provider = form.aiProvider || 'gemini';
  const usesProvider = (name) => provider === name || form.aiFallbackProvider === name;

  return (
    <form onSubmit={onSave} className="space-y-4">
      <PageHeader title="Draft order setup" subtitle="WhatsApp, Gmail, the AI reader and automatic replies." backTo="/draft-orders" backLabel="Draft orders" />
      {notice ? <p className="text-sm text-emerald-800">{notice}</p> : null}
      {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p> : null}

      <Section title="Public address">
        <Field label="This server's public address">
          <input className={inputClass} value={form.publicBaseUrl} onChange={(event) => set('publicBaseUrl', event.target.value)} placeholder="https://api.your-company.example" />
        </Field>
        {saved?.webhookUrl ? (
          <div className="space-y-1 text-sm text-slate">
            <p>
              WhatsApp webhook: <code className="break-all">{saved.webhookUrl}</code>{' '}
              <button type="button" onClick={() => copy(saved.webhookUrl, 'Webhook address')} className="font-semibold text-accent">
                Copy
              </button>
            </p>
            <p>
              Gmail redirect: <code className="break-all">{saved.gmailRedirectUrl}</code>{' '}
              <button type="button" onClick={() => copy(saved.gmailRedirectUrl, 'Redirect address')} className="font-semibold text-accent">
                Copy
              </button>
            </p>
          </div>
        ) : (
          <p className="text-sm text-slate">Save the address to see the webhook and redirect addresses.</p>
        )}
      </Section>

      <Section title="WhatsApp (Meta Cloud API)">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Verify token">
            <input className={inputClass} value={form.whatsappVerifyToken} onChange={(event) => set('whatsappVerifyToken', event.target.value)} />
          </Field>
          <Field label="Phone number id">
            <input className={inputClass} value={form.whatsappPhoneNumberId} onChange={(event) => set('whatsappPhoneNumberId', event.target.value)} />
          </Field>
          <SecretInput label="App secret" name="whatsappAppSecret" form={form} saved={saved} set={set} />
          <SecretInput label="Access token" name="whatsappAccessToken" form={form} saved={saved} set={set} />
          <Field label="Messages from one number within … minutes are one draft">
            <input className={inputClass} type="number" min="5" value={form.whatsappWindowMinutes} onChange={(event) => set('whatsappWindowMinutes', event.target.value)} />
          </Field>
        </div>
      </Section>

      <Section
        title="Gmail"
        actions={
          <div className="flex gap-2">
            <button type="button" onClick={connectGmail} className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-semibold">
              {saved?.gmailConnected ? 'Reconnect' : 'Connect Gmail'}
            </button>
            {saved?.gmailConnected ? (
              <button type="button" onClick={disconnectGmail} className="rounded-lg border border-rose-300 px-3 py-1.5 text-sm font-semibold text-rose-800">
                Disconnect
              </button>
            ) : null}
          </div>
        }
      >
        <p className="text-sm text-slate">
          {saved?.gmailConnected
            ? `Connected to ${saved.gmailEmail}. Last checked ${saved.gmailLastSyncAt ? new Date(saved.gmailLastSyncAt).toLocaleString() : 'not yet'}.`
            : 'Not connected. Save the client id and secret, then connect.'}
        </p>
        {saved?.gmailLastError ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">Last Gmail error: {saved.gmailLastError}</p> : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="OAuth client id">
            <input className={inputClass} value={form.gmailClientId} onChange={(event) => set('gmailClientId', event.target.value)} />
          </Field>
          <SecretInput label="OAuth client secret" name="gmailClientSecret" form={form} saved={saved} set={set} />
        </div>
        <p className="text-sm text-slate">
          The whole inbox is checked every minute. Mail with an order word below is read by the AI; other mail is listed under “Not orders” and its text is removed after the retention period.
        </p>
        <Field label="Order words, one per line">
          <textarea className={`${inputClass} min-h-36 font-mono text-xs`} value={form.orderKeywords} onChange={(event) => set('orderKeywords', event.target.value)} />
        </Field>
      </Section>

      <Section title="AI reader">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Reader">
            <select className={inputClass} value={provider} onChange={(event) => set('aiProvider', event.target.value)}>
              {PROVIDERS.map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="If it fails, try">
            <select className={inputClass} value={form.aiFallbackProvider} onChange={(event) => set('aiFallbackProvider', event.target.value)}>
              <option value="">Nothing — retry later</option>
              {PROVIDERS.filter(([id]) => id !== provider).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Most readings per day (0 = no limit)">
            <input className={inputClass} type="number" min="0" value={form.dailyReadLimit} onChange={(event) => set('dailyReadLimit', event.target.value)} />
          </Field>
        </div>
        {usesProvider('gemini') ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <SecretInput label="Gemini API key" name="geminiApiKey" form={form} saved={saved} set={set} />
            <Field label="Gemini model">
              <input className={inputClass} value={form.geminiModel} onChange={(event) => set('geminiModel', event.target.value)} />
            </Field>
          </div>
        ) : null}
        {usesProvider('claude') ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <SecretInput label="Claude API key" name="claudeApiKey" form={form} saved={saved} set={set} />
            <Field label="Claude model">
              <input className={inputClass} list="claude-models" value={form.claudeModel} onChange={(event) => set('claudeModel', event.target.value)} />
              <datalist id="claude-models">
                <option value="claude-opus-5-5">Most capable</option>
                <option value="claude-haiku-5-5">Faster and cheaper</option>
              </datalist>
            </Field>
          </div>
        ) : null}
        {usesProvider('openai') ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Server address (ends in /v1)">
              <input className={inputClass} value={form.openaiBaseUrl} onChange={(event) => set('openaiBaseUrl', event.target.value)} placeholder="http://localhost:11434/v1" />
            </Field>
            <Field label="Model">
              <input className={inputClass} value={form.openaiModel} onChange={(event) => set('openaiModel', event.target.value)} placeholder="qwen2.5vl:7b" />
            </Field>
            <SecretInput label="API key (if the server needs one)" name="openaiApiKey" form={form} saved={saved} set={set} />
          </div>
        ) : null}
        <p className="text-sm text-slate">
          Text PDFs are read on this server first; photos and scans are sent to the reader. An open model on your own server keeps messages in-house but cannot read scanned PDFs.
        </p>
        {saved?.usage ? (
          <div className="text-sm">
            <p className="font-semibold">Readings today: {saved.usage.today}</p>
            {saved.usage.days?.length ? (
              <div className="mt-2 overflow-x-auto">
                <table className="text-left text-xs">
                  <thead className="text-slate">
                    <tr>
                      <th className="pr-4">Day</th>
                      <th className="pr-4">Reader</th>
                      <th className="pr-4">Readings</th>
                      <th className="pr-4">Failed</th>
                      <th className="pr-4">Tokens in / out</th>
                    </tr>
                  </thead>
                  <tbody>
                    {saved.usage.days.slice(0, 14).map((row) => (
                      <tr key={`${row.day}-${row.provider}`}>
                        <td className="pr-4">{row.day}</td>
                        <td className="pr-4">{row.provider}</td>
                        <td className="pr-4">{row.calls}</td>
                        <td className="pr-4">{row.failed}</td>
                        <td className="pr-4">
                          {row.inputTokens.toLocaleString()} / {row.outputTokens.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        ) : null}
      </Section>

      <Section title="Automatic replies">
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={form.autoReplyEnabled} onChange={(event) => set('autoReplyEnabled', event.target.checked)} />
          Send “we received your order” when a draft is ready for review
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={form.autoReplyTestMode} onChange={(event) => set('autoReplyTestMode', event.target.checked)} />
          Test mode: only reply to the numbers and addresses below
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Test numbers / addresses (one per line)">
            <textarea className={`${inputClass} min-h-20`} value={form.autoReplyTestRecipients} onChange={(event) => set('autoReplyTestRecipients', event.target.value)} />
          </Field>
          <Field label="Reply text ({number} = draft number, {name} = sender)">
            <textarea className={`${inputClass} min-h-20`} value={form.autoReplyText} onChange={(event) => set('autoReplyText', event.target.value)} />
          </Field>
          <Field label="Most replies per sender per day">
            <input className={inputClass} type="number" min="0" value={form.autoReplyDailyPerSender} onChange={(event) => set('autoReplyDailyPerSender', event.target.value)} />
          </Field>
        </div>
        <p className="text-sm text-slate">One reply per conversation. Automated mail, newsletters and our own address are never answered. WhatsApp replies only go out within 24 hours of the customer’s message.</p>
      </Section>

      <Section title="Review and clean-up">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Review within … hours (task due time)">
            <input className={inputClass} type="number" min="1" value={form.reviewSlaHours} onChange={(event) => set('reviewSlaHours', event.target.value)} />
          </Field>
          <Field label="Remove text of non-order messages after … days">
            <input className={inputClass} type="number" min="7" value={form.retentionDays} onChange={(event) => set('retentionDays', event.target.value)} />
          </Field>
        </div>
      </Section>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={saving || !dirty} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-dark disabled:opacity-60">
          {saving ? 'Saving…' : 'Save setup'}
        </button>
        <p className="text-sm text-slate">
          To test the reader without WhatsApp or mail, use{' '}
          <Link to="/draft-orders/new" className="font-semibold text-accent">
            New draft
          </Link>
          .
        </p>
      </div>
    </form>
  );
}
