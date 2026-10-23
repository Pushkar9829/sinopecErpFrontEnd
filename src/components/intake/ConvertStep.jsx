import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { intakeApi } from '../../api/intake.api';
import { notify } from '../ui/confirm';
import { inputClass } from '../ui/FormField';
import { routeFitsOrderType } from '../../lib/sales';

const small = `${inputClass} mt-0 px-2 py-1.5 text-sm`;

function initialLines(lines, suggestions) {
  return (lines || []).map((line, index) => {
    const pick = (suggestions?.[index] || []).find((s) => s.strong) || null;
    return {
      include: true,
      product: line.product || '',
      quantity: line.quantity ?? '',
      unit: line.unit || '',
      rate: line.rate ?? '',
      width: line.width || '',
      length: line.length || '',
      material: line.material || '',
      notes: line.notes || '',
      saved: pick ? `${pick.source}:${pick.id}` : '',
      productionRoute: pick?.productionRoute || '',
    };
  });
}

function isoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) ? value : '';
}

// A date the message gave, only when it is still ahead.
function futureDate(value) {
  const date = isoDate(value);
  const today = new Date().toLocaleDateString('en-CA');
  return date && date >= today ? date : '';
}

// Step 2: turn the checked lines into a DRAFT sales order. It is never
// submitted from here; sales finish it in the normal order form.
export function ConvertStep({ draft, disabled, onError }) {
  const navigate = useNavigate();
  const [match, setMatch] = useState(null);
  const [orderType, setOrderType] = useState('sales_order');
  const [deliveryDate, setDeliveryDate] = useState(futureDate(draft.proposal?.deliveryDate));
  const [lines, setLines] = useState([]);
  const [busy, setBusy] = useState(false);
  const proposalKey = JSON.stringify(draft.proposal?.lines || []);

  useEffect(() => {
    let alive = true;
    intakeApi
      .match(draft.id)
      .then((data) => {
        if (!alive) return;
        setMatch(data);
        setLines(initialLines(draft.proposal?.lines, data.lineSuggestions));
      })
      .catch((err) => alive && onError(err.message));
    return () => {
      alive = false;
    };
    // Re-suggest when the saved lines or the customer change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.id, draft.customer, proposalKey]);

  const routes = useMemo(() => (match?.routes || []).filter((route) => routeFitsOrderType(route, orderType)), [match, orderType]);

  function setLine(index, patch) {
    setLines((current) => current.map((line, at) => (at === index ? { ...line, ...patch } : line)));
  }

  function chooseSaved(index, value) {
    const suggestion = (match?.lineSuggestions?.[index] || []).find((s) => `${s.source}:${s.id}` === value);
    setLine(index, {
      saved: value,
      ...(suggestion?.productionRoute ? { productionRoute: suggestion.productionRoute } : {}),
      ...(suggestion?.otherProcess ? { otherProcess: suggestion.otherProcess } : {}),
    });
  }

  async function convert() {
    setBusy(true);
    try {
      const result = await intakeApi.convert(draft.id, {
        version: draft.version,
        orderType,
        deliveryDate: deliveryDate || null,
        lines: lines.map((line) => {
          const [source, sourceId] = line.saved ? line.saved.split(':') : ['', ''];
          return { ...line, source, sourceId, quantity: line.quantity === '' ? 0 : Number(line.quantity), rate: line.rate === '' ? null : Number(line.rate) };
        }),
      });
      if (result.warnings?.length) await notify(`Some files were not copied: ${result.warnings.join('; ')}`, 'Order created');
      navigate(`/sales-orders/${result.order.id}`);
    } catch (err) {
      onError(err.message);
      setBusy(false);
    }
  }

  if (!match) return <p className="text-sm text-slate">Finding saved products…</p>;
  if (!lines.length) return <p className="text-sm text-slate">Add at least one line in Order details and save it first.</p>;
  const included = lines.filter((line) => line.include);
  const missingRoute = included.some(
    (line) =>
      !line.productionRoute ||
      !routes.some((route) => route.id === line.productionRoute) ||
      (line.productionRoute === 'other_dispatch' && !String(line.otherProcess || '').trim())
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <label className="text-sm font-semibold">
          Order type
          <select value={orderType} disabled={disabled} onChange={(event) => setOrderType(event.target.value)} className={inputClass}>
            <option value="sales_order">Sales order</option>
            <option value="job_work">Job work</option>
          </select>
        </label>
        <label className="text-sm font-semibold">
          Delivery date
          <input type="date" value={deliveryDate} disabled={disabled} onChange={(event) => setDeliveryDate(event.target.value)} className={inputClass} />
        </label>
      </div>
      {draft.proposal?.deliveryDate && !futureDate(draft.proposal.deliveryDate) ? (
        <p className="text-xs text-slate">The message said “{draft.proposal.deliveryDate}”. Pick the date above.</p>
      ) : null}

      <ul className="space-y-2">
        {lines.map((line, index) => {
          const suggestions = match.lineSuggestions?.[index] || [];
          return (
            <li key={index} className={`rounded-lg border p-3 ${line.include ? 'border-line' : 'border-dashed border-line opacity-60'}`}>
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" checked={line.include} disabled={disabled} onChange={(event) => setLine(index, { include: event.target.checked })} />
                {line.product || `Line ${index + 1}`} · {line.quantity || '?'} {line.unit}
                {line.width || line.length ? ` · ${line.width}×${line.length}` : ''}
              </label>
              {line.include ? (
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <label className="text-xs font-semibold text-slate">
                    Start from a saved product
                    <select value={line.saved} disabled={disabled} onChange={(event) => chooseSaved(index, event.target.value)} className={small}>
                      <option value="">None — new product</option>
                      {suggestions.map((s) => (
                        <option key={`${s.source}:${s.id}`} value={`${s.source}:${s.id}`}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs font-semibold text-slate">
                    Production route
                    <select
                      value={line.productionRoute}
                      disabled={disabled}
                      onChange={(event) => setLine(index, { productionRoute: event.target.value })}
                      className={`${small} ${line.productionRoute && routes.some((r) => r.id === line.productionRoute) ? '' : 'border-amber-400'}`}
                    >
                      <option value="">Choose…</option>
                      {routes.map((route) => (
                        <option key={route.id} value={route.id}>
                          {route.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  {line.productionRoute === 'other_dispatch' ? (
                    <label className="text-xs font-semibold text-slate">
                      Process name
                      <input
                        value={line.otherProcess || ''}
                        maxLength={60}
                        disabled={disabled}
                        onChange={(event) => setLine(index, { otherProcess: event.target.value })}
                        placeholder="e.g. Lamination"
                        className={`${small} ${String(line.otherProcess || '').trim() ? '' : 'border-amber-400'}`}
                      />
                    </label>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={disabled || busy || !included.length || missingRoute}
          onClick={convert}
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
        >
          {busy ? 'Creating…' : 'Create draft sales order'}
        </button>
        <p className="text-xs text-slate">
          {missingRoute ? 'Choose a production route for every checked line. ' : ''}The order opens as a draft; nothing is submitted. The customer’s files are attached as PO.
        </p>
      </div>
    </div>
  );
}
