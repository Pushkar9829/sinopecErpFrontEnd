import { useState } from 'react';
import { Link } from 'react-router-dom';
import { intakeApi } from '../../api/intake.api';
import { Badge } from '../ui/Badge';

const MATCHED_BY = { gst: 'GST number', mobile: 'mobile', email: 'email', name: 'name only' };

// Step 1: which customer is this? Pick a match or create one from the message.
export function CustomerStep({ draft, proposal, disabled, onDone, onError }) {
  const [busy, setBusy] = useState('');
  const match = draft.customerMatch;
  const fromMessage = proposal?.customer || {};
  const newName = fromMessage.name || fromMessage.companyName || draft.sender?.name || '';

  async function run(name, action) {
    setBusy(name);
    try {
      onDone(await action());
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy('');
    }
  }

  if (draft.customer) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm">
          <Link to={`/customers/${draft.customer}`} className="font-semibold text-accent hover:underline">
            {draft.customerName}
          </Link>
        </p>
        {!disabled ? (
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => run('clear', () => intakeApi.clearCustomer(draft.id, draft.version))}
            className="text-sm font-semibold text-slate disabled:opacity-60"
          >
            Change customer
          </button>
        ) : null}
      </div>
    );
  }

  const candidates = match?.candidates || [];
  return (
    <div className="space-y-3">
      {candidates.length ? (
        <ul className="space-y-2">
          {candidates.map((candidate) => (
            <li key={candidate.id} className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 ${candidate.id === match.best ? 'border-emerald-300 bg-emerald-50' : 'border-line'}`}>
              <div className="min-w-0 text-sm">
                <div className="font-semibold">
                  {candidate.companyName || candidate.name} <span className="font-normal text-slate">{candidate.code}</span>
                </div>
                <div className="text-xs text-slate">
                  {[candidate.mobile, candidate.email, candidate.gstNumber].filter(Boolean).join(' · ')}
                </div>
                <div className="mt-1 flex gap-1">
                  <Badge tone={candidate.matchedBy === 'name' ? 'warning' : 'success'}>Matched by {MATCHED_BY[candidate.matchedBy] || candidate.matchedBy}</Badge>
                  {!candidate.isActive ? <Badge tone="danger">Inactive</Badge> : null}
                </div>
              </div>
              {!disabled ? (
                <button
                  type="button"
                  disabled={Boolean(busy) || !candidate.isActive}
                  onClick={() => run(candidate.id, () => intakeApi.confirmCustomer(draft.id, { customerId: candidate.id, version: draft.version }))}
                  className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {busy === candidate.id ? 'Saving…' : 'Use this customer'}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate">No saved customer has this GST number, mobile, email or name.</p>
      )}
      {!disabled ? (
        <div className="rounded-lg border border-dashed border-line p-3 text-sm">
          <p className="text-slate">
            New customer from the message: <span className="font-semibold text-ink">{newName || 'no name found — fill the name in Order details first'}</span>
            {[fromMessage.mobile, fromMessage.email, fromMessage.gstNumber].filter(Boolean).length ? ` · ${[fromMessage.mobile, fromMessage.email, fromMessage.gstNumber].filter(Boolean).join(' · ')}` : ''}
          </p>
          <button
            type="button"
            disabled={Boolean(busy) || !newName}
            onClick={() =>
              run('create', () =>
                intakeApi.confirmCustomer(draft.id, {
                  version: draft.version,
                  create: {
                    name: newName,
                    companyName: fromMessage.companyName || '',
                    contactPerson: fromMessage.name || draft.sender?.name || '',
                    mobile: fromMessage.mobile || draft.sender?.phone || '',
                    email: fromMessage.email || '',
                    gstNumber: fromMessage.gstNumber || '',
                    billingAddress: fromMessage.billingAddress || '',
                    shippingAddress: fromMessage.shippingAddress || '',
                  },
                })
              )
            }
            className="mt-2 rounded-lg border border-line bg-white px-3 py-1.5 font-semibold disabled:opacity-60"
          >
            {busy === 'create' ? 'Creating…' : 'Create this customer'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
