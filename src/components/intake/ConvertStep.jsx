import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { intakeApi } from '../../api/intake.api';
import { notify } from '../ui/confirm';
import { inputClass } from '../ui/FormField';
import { routeFitsOrderType } from '../../lib/sales';
import { ProductPicker } from './ProductPicker';

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
      flap: line.flap || '',
      gusset: line.gusset || '',
      sizeUnit: line.sizeUnit || '',
      thickness: line.thickness ?? '',
      thicknessKind: line.thicknessKind || '',
      material: line.material || '',
      notes: line.notes || '',
      saved: pick ? `${pick.source}:${pick.id}` : '',
      savedLabel: pick?.label || '',
      saveToCustomer: true,
      productionRoute: pick?.productionRoute || '',
      otherProcess: pick?.otherProcess || '',
    };
  });
}

// A line the message did not have, picked from the saved products.
function extraLine(spec) {
  return {
    include: true,
    extra: true,
    product: spec.product || spec.label,
    quantity: '',
    unit: spec.unit || 'pcs',
    rate: spec.rate || '',
    width: spec.width || '',
    length: spec.length || '',
    material: spec.material || '',
    notes: '',
    saved: `${spec.source}:${spec.id}`,
    savedLabel: spec.label,
    saveToCustomer: false,
    productionRoute: spec.productionRoute || '',
    otherProcess: spec.otherProcess || '',
  };
}

// "12 × 16 inch · flap 2 · gusset 1 · 150 gauge" for the user to check.
function sizeSummary(line) {
  const unit = line.sizeUnit || (line.width || line.length ? 'inch' : '');
  return [
    line.width || line.length ? `${[line.width, line.length].filter(Boolean).join(' × ')} ${unit}`.trim() : '',
    line.flap ? `flap ${line.flap}` : '',
    line.gusset ? `gusset ${line.gusset}` : '',
    line.thickness ? `${line.thickness} ${line.thicknessKind || 'gauge'}` : '',
  ]
    .filter(Boolean)
    .join(' · ');
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

  // spec is null for "New product".
  function chooseSaved(index, spec) {
    if (!spec) {
      setLine(index, { saved: '', savedLabel: '' });
      return;
    }
    setLine(index, {
      saved: `${spec.source}:${spec.id}`,
      savedLabel: spec.label,
      ...(spec.productionRoute ? { productionRoute: spec.productionRoute } : {}),
      ...(spec.otherProcess ? { otherProcess: spec.otherProcess } : {}),
      ...(lines[index]?.extra ? { product: spec.product || spec.label, unit: spec.unit || 'pcs', rate: spec.rate || '' } : {}),
    });
  }

  function removeLine(index) {
    setLines((current) => current.filter((_line, at) => at !== index));
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
          return {
            ...line,
            source,
            sourceId,
            saveToCustomer: !line.saved && Boolean(line.saveToCustomer),
            quantity: line.quantity === '' ? 0 : Number(line.quantity),
            rate: line.rate === '' ? null : Number(line.rate),
          };
        }),
      });
      if (result.warnings?.length) await notify(result.warnings.join('\n'), 'Order created');
      navigate(`/sales-orders/${result.order.id}`);
    } catch (err) {
      onError(err.message);
      setBusy(false);
    }
  }

  if (!match) return <p className="text-sm text-slate">Finding saved products…</p>;
  const included = lines.filter((line) => line.include);
  const missingQuantity = included.some((line) => line.extra && !(Number(line.quantity) > 0));
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

      {!lines.length ? <p className="text-sm text-slate">No lines yet. Add them in Order details and save, or add a product from this customer below.</p> : null}
      <ul className="space-y-2">
        {lines.map((line, index) => (
          <li key={index} className={`rounded-lg border p-3 ${line.include ? 'border-line' : 'border-dashed border-line opacity-60'}`}>
            {line.extra ? (
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold">
                <span>
                  {line.product} <span className="font-normal text-slate">· added, not in the message</span>
                </span>
                {!disabled ? (
                  <button type="button" onClick={() => removeLine(index)} className="text-xs font-semibold text-rose-700">
                    Remove
                  </button>
                ) : null}
              </div>
            ) : (
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" checked={line.include} disabled={disabled} onChange={(event) => setLine(index, { include: event.target.checked })} />
                {line.product || `Line ${index + 1}`} · {line.quantity || '?'} {line.unit}
              </label>
            )}
            {sizeSummary(line) ? <p className="mt-1 text-xs text-slate">{sizeSummary(line)}</p> : null}
            {line.include ? (
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {line.extra ? (
                  <div className="grid grid-cols-3 gap-2 sm:col-span-2">
                    <label className="text-xs font-semibold text-slate">
                      Quantity
                      <input
                        type="number"
                        min="0"
                        value={line.quantity}
                        disabled={disabled}
                        onChange={(event) => setLine(index, { quantity: event.target.value })}
                        className={`${small} ${Number(line.quantity) > 0 ? '' : 'border-amber-400'}`}
                      />
                    </label>
                    <label className="text-xs font-semibold text-slate">
                      Unit
                      <input value={line.unit} disabled={disabled} onChange={(event) => setLine(index, { unit: event.target.value })} className={small} />
                    </label>
                    <label className="text-xs font-semibold text-slate">
                      Rate
                      <input type="number" min="0" step="any" value={line.rate} disabled={disabled} onChange={(event) => setLine(index, { rate: event.target.value })} className={small} />
                    </label>
                  </div>
                ) : null}
                <div className="text-xs font-semibold text-slate">
                  Product
                  <ProductPicker
                    draftId={draft.id}
                    lineIndex={line.extra ? undefined : index}
                    selectedLabel={line.savedLabel}
                    allowNew={!line.extra}
                    disabled={disabled}
                    onPick={(spec) => chooseSaved(index, spec)}
                  />
                  {!line.saved ? (
                    <label className="mt-1 flex items-center gap-2 font-normal text-ink">
                      <input type="checkbox" checked={line.saveToCustomer} disabled={disabled} onChange={(event) => setLine(index, { saveToCustomer: event.target.checked })} />
                      Save to this customer’s products
                    </label>
                  ) : null}
                </div>
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
        ))}
      </ul>
      {!disabled ? (
        <div className="max-w-sm">
          <ProductPicker
            draftId={draft.id}
            allowNew={false}
            buttonLabel="+ Add product from this customer"
            buttonClass="text-sm font-semibold text-accent"
            onPick={(spec) => spec && setLines((current) => [...current, extraLine(spec)])}
          />
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={disabled || busy || !included.length || missingRoute || missingQuantity}
          onClick={convert}
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
        >
          {busy ? 'Creating…' : 'Create draft sales order'}
        </button>
        <p className="text-xs text-slate">
          {missingRoute ? 'Choose a production route for every checked line. ' : ''}
          {missingQuantity ? 'Fill the quantity of each added product. ' : ''}The order opens as a draft; nothing is submitted. The customer’s files are attached as PO.
        </p>
      </div>
    </div>
  );
}
