import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { intakeApi } from '../api/intake.api';
import { Field, Section, inputClass } from '../components/ui/FormField';
import { PageHeader } from '../components/ui/PageHeader';

const EMPTY = {
  publicBaseUrl: '',
  whatsappVerifyToken: '',
  whatsappPhoneNumberId: '',
  whatsappAppSecret: '',
  whatsappAccessToken: '',
  gmailClientId: '',
  gmailClientSecret: '',
  geminiApiKey: '',
  geminiModel: 'gemini-3.5-flash-lite',
  orderKeywords: '',
};

export function DraftOrderSetup() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState(EMPTY);
  const [saved, setSaved] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [paste, setPaste] = useState('');
  const [pasting, setPasting] = useState(false);

  useEffect(() => {
    const gmail = params.get('gmail');
    if (gmail === 'connected') setNotice('Gmail is connected.');
    if (gmail === 'error') setError(params.get('message') || 'Gmail connection failed');
  }, [params]);

  useEffect(() => {
    intakeApi
      .settings()
      .then((data) => {
        setSaved(data);
        setForm((current) => ({
          ...current,
          publicBaseUrl: data.publicBaseUrl || '',
          whatsappVerifyToken: data.whatsappVerifyToken || '',
          whatsappPhoneNumberId: data.whatsappPhoneNumberId || '',
          gmailClientId: data.gmailClientId || '',
          geminiModel: data.geminiModel || 'gemini-3.5-flash-lite',
          orderKeywords: data.orderKeywords || '',
        }));
      })
      .catch((err) => setError(err.message));
  }, []);

  function set(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onSave(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const data = await intakeApi.saveSettings(form);
      setSaved(data);
      setForm((current) => ({
        ...current,
        whatsappAppSecret: '',
        whatsappAccessToken: '',
        gmailClientSecret: '',
        geminiApiKey: '',
      }));
      setNotice('Setup saved.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function onPaste(event) {
    event.preventDefault();
    setPasting(true);
    setError('');
    try {
      const draft = await intakeApi.paste(paste);
      navigate(`/draft-orders/${draft.id}`);
    } catch (err) {
      setError(err.message);
      setPasting(false);
    }
  }

  async function connectGmail() {
    setError('');
    try {
      const data = await intakeApi.gmailStart();
      window.location.assign(data.url);
    } catch (err) {
      setError(err.message);
    }
  }

  async function copyWebhook() {
    if (!saved?.webhookUrl) return;
    await navigator.clipboard.writeText(saved.webhookUrl);
    setNotice('Webhook address copied.');
  }

  return (
    <form onSubmit={onSave} className="space-y-4">
      <PageHeader
        title="Draft order setup"
        subtitle="WhatsApp, Gmail, and the reader. Drafts stay in this tab until a later step turns one into a sales order."
        backTo="/draft-orders"
        backLabel="Draft orders"
      />
      {notice ? <p className="text-sm text-emerald-800">{notice}</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <Section title="Public address">
        <Field label="Tunnel or public site address">
          <input className={inputClass} value={form.publicBaseUrl} onChange={(event) => set('publicBaseUrl', event.target.value)} placeholder="https://your-host.example" />
        </Field>
        <p className="text-sm text-slate">
          Webhook for Meta: {saved?.webhookUrl || 'Save the public address first.'}{' '}
          {saved?.webhookUrl ? (
            <button type="button" onClick={copyWebhook} className="font-semibold text-accent">
              Copy
            </button>
          ) : null}
        </p>
        <p className="text-sm text-slate">Gmail redirect to register in Google Cloud: {saved?.gmailRedirectUrl || 'Save the public address first.'}</p>
      </Section>

      <Section title="WhatsApp (Meta Cloud API)">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Verify token">
            <input className={inputClass} value={form.whatsappVerifyToken} onChange={(event) => set('whatsappVerifyToken', event.target.value)} />
          </Field>
          <Field label="Phone number id">
            <input className={inputClass} value={form.whatsappPhoneNumberId} onChange={(event) => set('whatsappPhoneNumberId', event.target.value)} />
          </Field>
          <Field label="App secret">
            <input className={inputClass} type="password" value={form.whatsappAppSecret} onChange={(event) => set('whatsappAppSecret', event.target.value)} placeholder={saved?.whatsappAppSecretSet ? 'Saved. Type a new value to replace it.' : ''} />
          </Field>
          <Field label="Access token">
            <input className={inputClass} type="password" value={form.whatsappAccessToken} onChange={(event) => set('whatsappAccessToken', event.target.value)} placeholder={saved?.whatsappAccessTokenSet ? 'Saved. Type a new value to replace it.' : ''} />
          </Field>
        </div>
      </Section>

      <Section title="Gmail" actions={
        <button type="button" onClick={connectGmail} className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-semibold">
          {saved?.gmailConnected ? `Reconnect${saved.gmailEmail ? ` (${saved.gmailEmail})` : ''}` : 'Connect Gmail'}
        </button>
      }>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="OAuth client id">
            <input className={inputClass} value={form.gmailClientId} onChange={(event) => set('gmailClientId', event.target.value)} />
          </Field>
          <Field label="OAuth client secret">
            <input className={inputClass} type="password" value={form.gmailClientSecret} onChange={(event) => set('gmailClientSecret', event.target.value)} placeholder={saved?.gmailClientSecretSet ? 'Saved. Type a new value to replace it.' : ''} />
          </Field>
        </div>
        <p className="text-sm text-slate">Save the client id and secret, then connect. Mail from the last 30 days is listed in this tab. The reader runs only when a keyword below is present, and that mail is marked Potential order.</p>
        <Field label="Order keywords, one per line">
          <textarea className={`${inputClass} min-h-36 font-mono text-xs`} value={form.orderKeywords} onChange={(event) => set('orderKeywords', event.target.value)} />
        </Field>
      </Section>

      <Section title="Reader">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Gemini API key">
            <input className={inputClass} type="password" value={form.geminiApiKey} onChange={(event) => set('geminiApiKey', event.target.value)} placeholder={saved?.geminiApiKeySet ? 'Saved. Type a new value to replace it.' : ''} />
          </Field>
          <Field label="Model">
            <input className={inputClass} value={form.geminiModel} onChange={(event) => set('geminiModel', event.target.value)} />
          </Field>
        </div>
        <p className="text-sm text-slate">Gemini 3.5 Flash-Lite reads chat, photos, and PDF invoices. A text PDF is read on the server first. A scan is sent as the file.</p>
      </Section>

      <button type="submit" disabled={saving} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-dark disabled:opacity-60">
        {saving ? 'Saving…' : 'Save setup'}
      </button>

      <Section title="Paste a message">
        <Field label="Text to read without WhatsApp">
          <textarea className={`${inputClass} min-h-28`} value={paste} onChange={(event) => setPaste(event.target.value)} />
        </Field>
        <button type="button" onClick={onPaste} disabled={pasting} className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold disabled:opacity-60">
          {pasting ? 'Reading…' : 'Create a test draft'}
        </button>
      </Section>

      <p className="text-sm text-slate">
        Back to the <Link to="/draft-orders" className="font-semibold text-accent">draft list</Link>.
      </p>
    </form>
  );
}
