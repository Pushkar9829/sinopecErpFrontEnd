import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { productionApi } from '../../api/production.api';
import { registersApi } from '../../api/registers.api';
import { confirmAction } from '../ui/ConfirmHost';
import { ArtworkButton } from './ArtworkButton';
import { LongText } from './LongText';
import { useAuth } from '../../context/AuthContext';
import { OPERATOR_LABEL, STAGE_COLUMNS, bookColumns, frozenColumns, isSuperAdmin, orderValue, paperQuantities, savedValue, typedDetails } from '../../lib/registerBooks';
import { DELIVERY_PARTNERS, formatDate, formatQty, toDateInput } from '../../lib/sales';

const cell = 'whitespace-nowrap border-b border-r border-stone-300 px-2 py-1.5 align-middle text-sm';
const head = 'whitespace-nowrap border-b border-r border-stone-400 bg-stone-100 px-2 py-1.5 text-left text-xs font-semibold uppercase tracking-wide text-stone-600';

function qtyOf(value, unit) {
  return `${formatQty(value)} ${unit || ''}`.trim();
}

function blankDraft() {
  return {
    jobId: '',
    lotId: '',
    inputQty: '',
    outputQty: '',
    wasteQty: '',
    details: {},
    deliveryPartner: '',
    handoverPerson: '',
    vehicleNumber: '',
    machineId: '',
    workDate: toDateInput(new Date()),
    prefilled: [],
    autoNet: true,
  };
}

// Fields that usually stay the same from one entry to the next on the same line.
const CARRY_OVER = {
  rolling: ['rollType', 'tare'],
  printing: ['cylinderSize', 'printDescription'],
  cutting: ['tubeUsed', 'rollType'],
};
// Figures written fresh for every entry.
const FRESH_KEYS = new Set(['gross', 'net', 'quantity']);

function carryOver(stage, line, machines) {
  const last = (line?.entries || []).at(-1);
  if (!last) return { details: {}, prefilled: [] };
  const details = {};
  for (const key of CARRY_OVER[stage] || []) {
    if (last.details?.[key]) details[key] = last.details[key];
  }
  const machine = last.machineName
    ? (machines || []).find((item) => last.machineName === item.name || last.machineName.startsWith(`${item.name} (`))
    : null;
  const top = {};
  if (machine) top.machineId = machine.id;
  if (stage === 'dispatch') {
    if (last.deliveryPartner) top.deliveryPartner = last.deliveryPartner;
    if (last.handoverPerson) top.handoverPerson = last.handoverPerson;
    if (last.vehicleNumber) top.vehicleNumber = last.vehicleNumber;
  }
  return { ...top, details, prefilled: [...Object.keys(details), ...Object.keys(top)] };
}

const labelClass = 'block text-xs font-semibold uppercase tracking-wide text-stone-500';
const cellBox = 'w-full min-w-0 rounded border border-stone-400 bg-white px-1.5 py-1 text-sm font-normal text-ink outline-none focus:border-accent';
const barBox = 'mt-0.5 block rounded border border-stone-400 bg-white px-2 py-1.5 text-sm font-normal text-ink outline-none focus:border-accent';
const needsTint = 'border-amber-500 bg-amber-50';
const ENTRY_FORM = 'register-entry-form';
const WEIGHT_KEYS = new Set(['gross', 'tare', 'net']);

function spanClass({ wide, full }) {
  if (full) return 'col-span-2 sm:col-span-3 lg:col-span-4';
  if (wide) return 'col-span-2';
  return '';
}

function EntrySection({ title, muted = false, children }) {
  return (
    <section className={`rounded-lg border px-3 py-3 lg:px-4 ${muted ? 'border-stone-300 bg-[#f6f1e4]' : 'border-stone-300 bg-white'}`}>
      <h3 className="mb-3 text-sm font-semibold text-stone-900">{title}</h3>
      <div className="grid grid-cols-2 gap-x-3 gap-y-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-4">{children}</div>
    </section>
  );
}

function ReadField({ label, value, wide = false }) {
  return (
    <div className={`min-w-0 ${spanClass({ wide })}`}>
      <p className={labelClass}>{label}</p>
      <p className="mt-1 truncate text-sm font-medium text-stone-900" title={value || ''}>
        {value || '—'}
      </p>
    </div>
  );
}

function EntryActions({ entry, onEdit, onDelete, busy }) {
  if (entry.editable === false) {
    return (
      <td className={`${cell} text-right text-xs text-stone-500`} title="This order is completed, so its entries are locked.">
        Locked
      </td>
    );
  }
  return (
    <td className={`${cell} text-right`}>
      <div className="flex justify-end gap-1">
        <button
          type="button"
          onClick={() => onEdit(entry)}
          disabled={busy}
          className="rounded border border-stone-400 bg-white px-2 py-0.5 text-xs font-semibold text-stone-800 hover:bg-stone-100 disabled:opacity-50"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => onDelete(entry)}
          disabled={busy}
          className="rounded border border-red-300 bg-white px-2 py-0.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    </td>
  );
}

function PaperBook({ stage, columns, entries, isAdmin, canChange, onEdit, onDelete, busy, adding = false, editingId = '', renderEntry }) {
  const span = 3 + columns.length + (canChange ? 1 : 0);
  const frozen = frozenColumns(columns);
  const headAt = (key) => (frozen[key] ? { className: `${head} ${frozen[key].className} z-20`, style: frozen[key].style } : { className: head });
  const cellAt = (key, extra = '') =>
    frozen[key] ? { className: `${cell} ${extra} ${frozen[key].className} bg-inherit`, style: frozen[key].style } : { className: `${cell} ${extra}` };

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <table className="w-full border-separate border-spacing-0 border-l border-t border-stone-300 text-sm">
        <thead className="sticky top-0 z-20">
          <tr>
            <th {...headAt('no')}>No</th>
            <th {...headAt('date')}>Date</th>
            {columns.map((column) => (
              <th key={column.key} {...headAt(column.key)}>
                {column.label}
              </th>
            ))}
            <th className={head}>{OPERATOR_LABEL[stage]}</th>
            {canChange ? <th className={head} /> : null}
          </tr>
        </thead>
        <tbody>
          {adding ? renderEntry(cellAt) : null}
          {entries.length === 0 ? (
            adding ? null : (
              <tr>
                <td className={`${cell} text-stone-500`} colSpan={span}>
                  No entry on this stage yet.
                </td>
              </tr>
            )
          ) : (
            entries.map((entry, index) =>
              entry.id === editingId ? (
                renderEntry(cellAt, index)
              ) : (
              <tr key={entry.id} className={index % 2 ? 'bg-[#fbf7ee]' : 'bg-white'}>
                <td {...cellAt('no', 'text-stone-500')}>{index + 1}</td>
                <td {...cellAt('date')}>{formatDate(entry.workDate || entry.markedAt)}</td>
                {columns.map((column) => (
                  <td key={column.key} {...cellAt(column.key, column.key === 'orderNumber' ? 'font-semibold' : '')}>
                    {column.key === 'orderNumber' ? (
                      <Link to={isAdmin ? `/registers/${entry.orderId}` : `/sales-orders/${entry.orderId}`} className="hover:underline">
                        {savedValue(entry, column.key) || '—'}
                      </Link>
                    ) : column.long ? (
                      <LongText text={savedValue(entry, column.key)} title={column.label} />
                    ) : column.artwork ? (
                      <span className="inline-flex max-w-[16rem] items-center gap-1.5">
                        <span className="min-w-0 truncate">{savedValue(entry, column.key) || '—'}</span>
                        <ArtworkButton orderId={entry.orderId} itemId={entry.itemId} />
                      </span>
                    ) : (
                      savedValue(entry, column.key) || '—'
                    )}
                  </td>
                ))}
                <td className={cell}>{entry.markedByName || '—'}</td>
                {canChange ? <EntryActions entry={entry} onEdit={onEdit} onDelete={onDelete} busy={busy} /> : null}
              </tr>
              )
            )
          )}
        </tbody>
      </table>
    </div>
  );
}

const SAME_AS_BOOK = { rollSize: 'rollSize', colour: 'colour', jobSize: 'jobSize', impression: 'impression', artwork: 'artwork', hole: 'hole' };

function JobDetails({ line, shownKeys }) {
  const fields = (line.jobFields || []).filter((field) => !shownKeys.includes(SAME_AS_BOOK[field.key]));
  const left = line.remaining != null && line.unit ? `${formatQty(line.remaining)} ${line.unit} of ${formatQty(line.quantity)}` : '';
  if (!fields.length && !line.instructions && !left) return null;
  return (
    <EntrySection title="Job details for this stage" muted>
      {left ? <ReadField label="Left to do" value={left} /> : null}
      {fields.filter((field) => !field.long).map((field) => (
        <ReadField key={field.key} label={field.label} value={field.value} />
      ))}
      {[...fields.filter((field) => field.long), line.instructions ? { key: 'instructions', label: 'Production instructions', value: line.instructions } : null]
        .filter(Boolean)
        .map((field) => (
          <div key={field.key} className="col-span-full min-w-0">
            <p className={labelClass}>{field.label}</p>
            <p className="mt-1 whitespace-pre-line text-sm font-medium text-stone-900">{field.value}</p>
          </div>
        ))}
    </EntrySection>
  );
}

function entryForm({ stage, columns, openLines, chosen, draft, setDraft, isDelivery, machines, editing }) {
  const paperQty = columns ? paperQuantities(stage, draft.details) : null;
  const madeNow = paperQty ? paperQty.outputQty : Number(draft.outputQty);
  const wasteNow = paperQty ? paperQty.wasteQty : Number(draft.wasteQty) || 0;
  const pickedLot = (chosen?.sourceLots || []).find((lot) => lot.id === draft.lotId) || chosen?.sourceLots?.[0];
  const sourceUnit = editing ? '' : chosen?.pickup?.unit || pickedLot?.unit || chosen?.unit || '';
  const unitsDiffer = editing
    ? Math.abs(Number(editing.inputQty) - (Number(editing.outputQty) + (isDelivery ? 0 : Number(editing.wasteQty || 0)))) > 1e-6
    : Boolean(chosen) && sourceUnit.toLowerCase() !== String(chosen.unit || '').toLowerCase();
  const usedOver =
    !isDelivery &&
    !unitsDiffer &&
    draft.inputQty !== '' &&
    Math.abs(Number(draft.inputQty) - (madeNow + wasteNow)) > 1e-6;
  const usedMissing = unitsDiffer && !(Number(draft.inputQty) > 0);
  const wasteBlocked = paperQty ? paperQty.wasteOk === false : false;
  const weightError = paperQty?.weightError || '';
  const deliveryBlocked = isDelivery && (!draft.deliveryPartner || !draft.handoverPerson.trim() || !draft.vehicleNumber.trim());

  function setField(key, value) {
    setDraft((current) => {
      const details = { ...(current.details || {}), [key]: value };
      let autoNet = current.autoNet !== false;
      if (stage === 'rolling' && key === 'net') autoNet = String(value).trim() === '';
      if (stage === 'rolling' && autoNet && (key === 'gross' || key === 'tare')) {
        const gross = Number(details.gross);
        const tare = Number(details.tare || 0);
        const ready = String(details.gross ?? '').trim() !== '' && Number.isFinite(gross) && Number.isFinite(tare) && gross >= tare;
        details.net = ready ? String(Math.round((gross - tare) * 1000) / 1000) : '';
      }
      return { ...current, details, autoNet };
    });
  }

  function chooseLine(jobId) {
    const line = openLines.find((item) => item.jobId === jobId);
    setDraft((current) => ({
      ...current,
      machineId: '',
      jobId,
      lotId: line?.sourceLots?.[0]?.id || '',
      ...carryOver(stage, line, machines),
    }));
  }

  const prefilled = new Set(draft.prefilled || []);
  const fieldLabel = (key, label) => {
    if (key === 'wastage' && unitsDiffer && sourceUnit) label = `${label} (${sourceUnit})`;
    if (prefilled.has(key)) return `${label} · last entry`;
    if (stage === 'rolling' && key === 'net' && draft.autoNet !== false && draft.details?.net) return `${label} · gross − tare`;
    return label;
  };
  const needsValue = (key) => !editing && FRESH_KEYS.has(key) && !String(draft.details?.[key] ?? '').trim();

  const setTop = (key) => (event) => setDraft((current) => ({ ...current, [key]: event.target.value }));
  const canSubmit =
    Boolean(chosen) && madeNow > 0 && !deliveryBlocked && !wasteBlocked && !weightError && !usedOver && !usedMissing;

  return {
    madeNow,
    sourceUnit,
    unitsDiffer,
    usedOver,
    wasteBlocked,
    weightError,
    prefilled,
    canSubmit,
    setField,
    chooseLine,
    fieldLabel,
    needsValue,
    setTop,
  };
}

function useEntryRowFocus(jobId) {
  const ref = useRef(null);
  useEffect(() => {
    const row = ref.current;
    if (!row) return;
    row.scrollIntoView({ block: 'nearest' });
    const target = row.querySelector('[data-needs="1"]') || row.querySelector('select:not([disabled]), input:not([type="date"])');
    target?.focus({ preventScroll: true });
  }, [jobId]);
  return ref;
}

function OrderCell({ editing, draft, openLines, form }) {
  if (editing) return <span className="font-semibold">{editing.orderNumber}</span>;
  return (
    <select
      form={ENTRY_FORM}
      required
      value={draft.jobId}
      onChange={(event) => form.chooseLine(event.target.value)}
      title="Order"
      className={`${cellBox} font-semibold ${draft.jobId ? '' : needsTint}`}
    >
      <option value="">{openLines.length ? 'Choose order' : 'Nothing waiting'}</option>
      {openLines.map((line) => (
        <option key={line.jobId} value={line.jobId}>
          {line.orderNumber} — {line.product}
        </option>
      ))}
    </select>
  );
}

function PaperCellInput({ column, draft, form }) {
  const value = draft.details?.[column.key] || '';
  const onChange = (event) => form.setField(column.key, event.target.value);
  const needs = form.needsValue(column.key);
  const title = form.fieldLabel(column.key, column.label);
  const tint = needs ? needsTint : form.prefilled.has(column.key) ? 'bg-sky-50' : '';
  if (column.choices) {
    return (
      <select form={ENTRY_FORM} value={value} onChange={onChange} title={title} className={`${cellBox} min-w-[9rem] ${tint}`}>
        <option value="">Choose</option>
        {column.choices.map((choice) => (
          <option key={choice} value={choice}>
            {choice}
          </option>
        ))}
      </select>
    );
  }
  if (column.long) {
    return <textarea form={ENTRY_FORM} value={value} onChange={onChange} rows={2} title={title} placeholder="Notes" className={`${cellBox} min-w-[14rem] ${tint}`} />;
  }
  const numeric = column.qty || WEIGHT_KEYS.has(column.key);
  return (
    <input
      form={ENTRY_FORM}
      value={value}
      onChange={onChange}
      inputMode={numeric ? 'decimal' : 'text'}
      placeholder={numeric ? '0' : ''}
      title={title}
      data-needs={needs ? '1' : undefined}
      className={`${cellBox} ${numeric ? 'min-w-[5.5rem]' : 'min-w-[8rem]'} ${tint}`}
    />
  );
}

function ReadCell({ column, line }) {
  const value = orderValue(line, column.key);
  if (column.long) return <LongText text={value} title={column.label} />;
  if (column.artwork && line) {
    return (
      <span className="inline-flex max-w-[16rem] items-center gap-1.5">
        <span className="min-w-0 truncate">{value || '—'}</span>
        <ArtworkButton orderId={line.orderId} itemId={line.itemId} />
      </span>
    );
  }
  return value || '—';
}

function RowSave({ form, saving, editing, onCancel }) {
  return (
    <td className={`${cell} text-right`}>
      <div className="flex justify-end gap-1">
        <button
          type="submit"
          form={ENTRY_FORM}
          disabled={saving || !form.canSubmit}
          className="rounded bg-stone-900 px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-50"
        >
          {saving ? 'Saving…' : editing ? 'Save' : 'Enter'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded border border-stone-400 bg-white px-2 py-1 text-xs font-semibold text-stone-800 hover:bg-stone-100"
        >
          Cancel
        </button>
      </div>
    </td>
  );
}

const entryRowClass = 'bg-[#fff3cf] shadow-[inset_0_0_0_2px_#d97706]';

function PaperEntryRow({ columns, cellAt, draft, form, chosen, editing, openLines, operatorName, saving, onCancel }) {
  const ref = useEntryRowFocus(draft.jobId);
  return (
    <tr ref={ref} className={entryRowClass} onKeyDown={(event) => event.key === 'Escape' && onCancel()}>
      <td {...cellAt('no', 'text-xs font-semibold uppercase text-amber-800')}>{editing ? 'Edit' : 'New'}</td>
      <td {...cellAt('date')}>
        <input form={ENTRY_FORM} type="date" required value={draft.workDate} onChange={form.setTop('workDate')} className={cellBox} />
      </td>
      {columns.map((column) => (
        <td key={column.key} {...cellAt(column.key, 'align-top')}>
          {column.key === 'orderNumber' ? (
            <OrderCell editing={editing} draft={draft} openLines={openLines} form={form} />
          ) : column.edit ? (
            <PaperCellInput column={column} draft={draft} form={form} />
          ) : (
            <ReadCell column={column} line={chosen} />
          )}
        </td>
      ))}
      <td className={cell}>{editing ? editing.markedByName || '—' : operatorName || '—'}</td>
      <RowSave form={form} saving={saving} editing={editing} onCancel={onCancel} />
    </tr>
  );
}

function PlainEntryRow({ draft, form, chosen, editing, openLines, operatorName, saving, onCancel, isDelivery, showCustomerName }) {
  const ref = useEntryRowFocus(draft.jobId);
  const needsQty = !editing && draft.outputQty === '';
  const text = (key, label) => (
    <input
      form={ENTRY_FORM}
      required
      value={draft[key]}
      onChange={form.setTop(key)}
      title={form.fieldLabel(key, label)}
      className={`${cellBox} min-w-[8rem] ${draft[key].trim() ? (form.prefilled.has(key) ? 'bg-sky-50' : '') : needsTint}`}
    />
  );
  return (
    <tr ref={ref} className={entryRowClass} onKeyDown={(event) => event.key === 'Escape' && onCancel()}>
      <td className={`${cell} text-xs font-semibold uppercase text-amber-800`}>{editing ? 'Edit' : 'New'}</td>
      <td className={cell}>
        <input form={ENTRY_FORM} type="date" required value={draft.workDate} onChange={form.setTop('workDate')} className={`${cellBox} min-w-[9rem]`} />
      </td>
      <td className={cell}>
        <div className="min-w-[12rem]">
          <OrderCell editing={editing} draft={draft} openLines={openLines} form={form} />
        </div>
      </td>
      <td className={cell}>{chosen?.customerCode || '—'}</td>
      {showCustomerName ? <td className={cell}>{chosen?.customerName || '—'}</td> : null}
      <td className={cell}>{chosen?.product || '—'}</td>
      <td className={cell}>
        <input
          form={ENTRY_FORM}
          type="number"
          required
          min="0"
          step="any"
          value={draft.outputQty}
          onChange={form.setTop('outputQty')}
          placeholder={chosen && !editing ? `Left ${formatQty(chosen.remaining)}` : '0'}
          title={isDelivery ? 'Quantity sent' : 'Production'}
          data-needs={needsQty ? '1' : undefined}
          className={`${cellBox} min-w-[7rem] ${needsQty ? needsTint : ''}`}
        />
      </td>
      {isDelivery ? (
        <>
          <td className={cell}>
            <select
              form={ENTRY_FORM}
              required
              value={draft.deliveryPartner}
              onChange={form.setTop('deliveryPartner')}
              title={form.fieldLabel('deliveryPartner', 'Who is sending')}
              className={`${cellBox} min-w-[8rem] ${draft.deliveryPartner ? (form.prefilled.has('deliveryPartner') ? 'bg-sky-50' : '') : needsTint}`}
            >
              <option value="">Choose</option>
              {DELIVERY_PARTNERS.map((partner) => (
                <option key={partner} value={partner}>
                  {partner}
                </option>
              ))}
            </select>
          </td>
          <td className={cell}>{text('handoverPerson', 'Person')}</td>
          <td className={cell}>{text('vehicleNumber', 'Vehicle')}</td>
        </>
      ) : (
        <>
          <td className={cell}>
            <input
              form={ENTRY_FORM}
              type="number"
              required={form.unitsDiffer}
              min="0"
              step="any"
              value={draft.inputQty}
              onChange={form.setTop('inputQty')}
              placeholder={form.unitsDiffer ? form.sourceUnit : 'auto'}
              title={form.sourceUnit ? `Used (${form.sourceUnit})` : 'Used'}
              className={`${cellBox} min-w-[6rem]`}
            />
          </td>
          <td className={cell}>
            <input
              form={ENTRY_FORM}
              type="number"
              min="0"
              step="any"
              value={draft.wasteQty}
              onChange={form.setTop('wasteQty')}
              placeholder="0"
              title="Waste"
              className={`${cellBox} min-w-[6rem]`}
            />
          </td>
          <td className={cell}>{chosen?.pickup?.lotName || (chosen?.sourceLots || []).find((lot) => lot.id === draft.lotId)?.name || '—'}</td>
        </>
      )}
      <td className={cell}>{editing ? editing.markedByName || '—' : operatorName || '—'}</td>
      <RowSave form={form} saving={saving} editing={editing} onCancel={onCancel} />
    </tr>
  );
}

function BarField({ label, children }) {
  return (
    <label className="block min-w-0">
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );
}

function EntryBar({ columns, draft, form, chosen, editing, machines, isDelivery, fromTask, saving, error, onRelease }) {
  const lots = !editing && !chosen?.pickup ? chosen?.sourceLots || [] : [];
  const showUsed = form.unitsDiffer && Boolean(columns || isDelivery);
  return (
    <div className="space-y-2 border-b border-amber-300 bg-[#fffaf0] px-4 py-3">
      {fromTask && !editing ? (
        <p className="text-sm text-sky-950">
          <span className="font-semibold">From task {fromTask}.</span> The yellow row in the register below is filled from the order
          {draft.prefilled?.length ? ' and the last entry (light blue boxes)' : ''}. Type today&apos;s figures in the{' '}
          <span className="font-semibold text-amber-800">orange-bordered</span> boxes and press Enter. You&apos;ll go back to your tasks.
        </p>
      ) : (
        <p className="text-sm text-stone-700">
          {editing ? 'Change the yellow row in the register, then press Save.' : 'Fill the yellow row at the top of the register, then press Enter.'}
        </p>
      )}
      <div className="flex flex-wrap items-end gap-3">
        {machines?.length ? (
          <BarField label={form.fieldLabel('machineId', 'Machine')}>
            <select
              form={ENTRY_FORM}
              value={draft.machineId || ''}
              onChange={form.setTop('machineId')}
              className={`${barBox} ${form.prefilled.has('machineId') ? 'bg-sky-50' : ''}`}
            >
              <option value="">{editing ? editing.machineName || 'Keep as is' : 'Choose'}</option>
              {machines.map((machine) => (
                <option key={machine.id} value={machine.id}>
                  {machine.name}
                </option>
              ))}
            </select>
          </BarField>
        ) : null}
        {lots.length ? (
          <BarField label="Material">
            <select form={ENTRY_FORM} value={draft.lotId || lots[0]?.id || ''} onChange={form.setTop('lotId')} className={`${barBox} max-w-[22rem]`}>
              {lots.map((lot) => (
                <option key={lot.id} value={lot.id}>
                  {lot.name} — {formatQty(lot.quantity)} {lot.unit}
                </option>
              ))}
            </select>
          </BarField>
        ) : null}
        {showUsed ? (
          <BarField label={`${isDelivery ? 'Taken from stock' : 'Used'}${form.sourceUnit ? ` (${form.sourceUnit})` : ''}`}>
            <input
              form={ENTRY_FORM}
              type="number"
              required
              min="0"
              step="any"
              value={draft.inputQty}
              onChange={form.setTop('inputQty')}
              className={`${barBox} w-32 ${Number(draft.inputQty) > 0 ? '' : needsTint}`}
            />
          </BarField>
        ) : null}
      </div>
      {chosen?.pickup ? (
        <p className="flex flex-wrap items-center gap-2 text-sm text-amber-950">
          <span>
            {formatQty(chosen.pickup.qty)} {chosen.pickup.unit} already taken for this line
            {chosen.pickup.lotName ? ` from ${chosen.pickup.lotName}` : ''}.
          </span>
          <button type="button" onClick={onRelease} disabled={saving} className="font-semibold underline disabled:opacity-50">
            Return to store
          </button>
        </p>
      ) : null}
      {form.wasteBlocked ? <p className="text-sm text-red-800">Enter wastage as a number.</p> : null}
      {form.weightError ? <p className="text-sm text-red-800">{form.weightError}</p> : null}
      {form.usedOver ? <p className="text-sm text-red-800">Used must equal made plus waste.</p> : null}
      {error ? <p className="text-sm text-red-800">{error}</p> : null}
      {!editing && chosen ? (
        <details open={Boolean(fromTask)} className="rounded border border-stone-300 bg-white px-3 py-2">
          <summary className="cursor-pointer text-sm font-semibold text-stone-900">Job sheet for this order</summary>
          <div className="mt-2">
            <JobDetails line={chosen} shownKeys={(columns || []).filter((column) => !column.edit).map((column) => column.key)} />
          </div>
        </details>
      ) : null}
    </div>
  );
}

export function StageRegister({ stage, isAdmin, presetJob = '', fromTask = '', operatorName = '', onConsumePreset, onEntryState, onSaved }) {
  const { user } = useAuth();
  const showCustomerName = isSuperAdmin(user);
  const [book, setBook] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [entryOpen, setEntryOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [machines, setMachines] = useState([]);
  const openedJob = useRef('');
  const [draft, setDraft] = useState({
    jobId: '',
    lotId: '',
    inputQty: '',
    outputQty: '',
    wasteQty: '',
    workDate: toDateInput(new Date()),
    deliveryPartner: '',
    handoverPerson: '',
    vehicleNumber: '',
    machineId: '',
    details: {},
  });

  useEffect(() => {
    if (!stage || stage === 'dispatch') {
      setMachines([]);
      return;
    }
    productionApi.machines(stage).then(setMachines).catch(() => setMachines([]));
  }, [stage]);

  useEffect(() => {
    if (!stage) return undefined;
    let alive = true;
    setError('');
    setBook(null);
    registersApi
      .stage(stage)
      .then((data) => alive && setBook(data))
      .catch((err) => alive && setError(err.message));
    return () => {
      alive = false;
    };
  }, [stage]);

  useEffect(() => {
    setDraft((current) => ({
      ...current,
      ...blankDraft(),
    }));
    setNotice('');
    setEntryOpen(false);
    setEditing(null);
  }, [stage]);

  useEffect(() => {
    if (!presetJob) openedJob.current = '';
  }, [presetJob]);

  useEffect(() => {
    if (!book || !presetJob || openedJob.current === presetJob) return;
    const line = (book.open || []).find((item) => item.jobId === presetJob && item.canMark);
    if (!line) {
      openedJob.current = presetJob;
      setNotice(
        book.canMark
          ? 'This line has nothing waiting at this stage right now.'
          : 'You can view this register. Entries are made by the stage operator.'
      );
      onConsumePreset?.();
      return;
    }
    openedJob.current = presetJob;
    setDraft((current) => ({
      ...current,
      ...blankDraft(),
      jobId: presetJob,
      lotId: line.sourceLots?.[0]?.id || '',
      ...carryOver(stage, line, machines),
    }));
    setEntryOpen(true);
  }, [book, presetJob]);

  useEffect(() => {
    if (!entryOpen || editing || !machines.length) return;
    setDraft((current) => {
      if (current.machineId || !current.jobId) return current;
      const line = (book?.open || []).find((item) => item.jobId === current.jobId);
      const carried = carryOver(stage, line, machines);
      if (!carried.machineId) return current;
      return { ...current, machineId: carried.machineId, prefilled: [...new Set([...(current.prefilled || []), 'machineId'])] };
    });
  }, [machines, entryOpen, editing, book, stage]);

  const entries = [...(book?.entries || [])].sort(
    (a, b) => new Date(b.workDate || b.markedAt) - new Date(a.workDate || a.markedAt)
  );
  const openLines = (book?.open || []).filter((line) => line.canMark);
  const canEnter = Boolean(book?.canMark);
  const editLine = editing
    ? {
        orderId: editing.orderId,
        itemId: editing.itemId,
        orderNumber: editing.orderNumber,
        product: editing.product,
        productCode: editing.productCode,
        customerName: editing.customerName,
        customerCode: editing.customerCode,
        unit: editing.unit,
        specs: editing.details || {},
        sourceLots: [],
        pickup: null,
      }
    : null;
  const chosen = editLine || openLines.find((line) => line.jobId === draft.jobId) || null;
  const isDelivery = stage === 'dispatch';
  const columns = bookColumns(stage, showCustomerName);
  const form = entryForm({ stage, columns, openLines, chosen, draft, setDraft, isDelivery, machines, editing });
  const adding = entryOpen && !editing;
  const editingId = entryOpen && editing ? editing.id : '';
  const rowProps = { draft, form, chosen, editing, openLines, operatorName, saving, onCancel: closeEntry };

  async function reloadStage() {
    const next = await registersApi.stage(stage);
    setBook(next);
  }

  async function submitEntry(event) {
    event.preventDefault();
    if (!chosen || !canEnter) return;
    setError('');
    setNotice('');
    setSaving(true);
    try {
      const paper = STAGE_COLUMNS[stage];
      const paperQty = paper ? paperQuantities(stage, draft.details) : null;
      const made = paperQty ? paperQty.outputQty : Number(draft.outputQty);
      const waste = paperQty ? paperQty.wasteQty : isDelivery ? 0 : Number(draft.wasteQty) || 0;
      const used = draft.inputQty === '' ? made + waste : Number(draft.inputQty);
      if (editing) {
        await productionApi.updateEntry({
          orderId: editing.orderId,
          entryId: editing.id,
          outputQty: made,
          wasteQty: waste,
          inputQty: draft.inputQty === '' ? undefined : Number(draft.inputQty),
          machineId: draft.machineId || undefined,
          workDate: draft.workDate,
          vehicleNumber: draft.vehicleNumber,
          handoverPerson: draft.handoverPerson,
          deliveryPartner: draft.deliveryPartner,
          details: paper ? typedDetails(stage, draft.details) : undefined,
        });
        setEntryOpen(false);
        setEditing(null);
        await reloadStage();
        setNotice('Entry updated.');
        return;
      }
      await productionApi.enter({
        orderId: chosen.orderId,
        itemId: chosen.itemId,
        stage,
        outputQty: made,
        inputQty: isDelivery ? (draft.inputQty === '' ? made : Number(draft.inputQty)) : used,
        wasteQty: waste,
        lotId: draft.lotId || undefined,
        machineId: draft.machineId || undefined,
        workDate: draft.workDate,
        vehicleNumber: draft.vehicleNumber,
        handoverPerson: draft.handoverPerson,
        deliveryPartner: draft.deliveryPartner,
        details: paper ? typedDetails(stage, draft.details) : undefined,
      });
      setDraft((current) => ({
        ...current,
        ...blankDraft(),
      }));
      setEntryOpen(false);
      onConsumePreset?.();
      if (onSaved?.()) return;
      await reloadStage();
      setNotice('Entry saved on the register.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function closeEntry() {
    setEntryOpen(false);
    if (editing) {
      setEditing(null);
      return;
    }
    onConsumePreset?.();
  }

  function startEdit(entry) {
    const details = { ...(entry.details || {}) };
    if (stage === 'printing' || stage === 'cutting') details.quantity = String(entry.outputQty || '');
    if (!details.wastage && entry.wasteQty) details.wastage = String(entry.wasteQty);
    const differ = Math.abs(Number(entry.inputQty) - (Number(entry.outputQty) + Number(entry.wasteQty || 0))) > 1e-6;
    setError('');
    setNotice('');
    setEditing(entry);
    setDraft({
      ...blankDraft(),
      autoNet: false,
      jobId: 'edit',
      inputQty: differ ? String(entry.inputQty ?? '') : '',
      outputQty: String(entry.outputQty ?? ''),
      wasteQty: entry.wasteQty ? String(entry.wasteQty) : '',
      workDate: toDateInput(entry.workDate || entry.markedAt || new Date()),
      deliveryPartner: entry.deliveryPartner || '',
      handoverPerson: entry.handoverPerson || '',
      vehicleNumber: entry.vehicleNumber || '',
      details,
    });
    setEntryOpen(true);
  }

  async function removeEntry(entry) {
    const ok = await confirmAction({
      title: 'Delete entry',
      message: `Delete this ${stage} entry for ${entry.orderNumber}? The material it used goes back to store and what it made is taken out of stock.`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    setError('');
    setNotice('');
    setSaving(true);
    try {
      await productionApi.deleteEntry({ orderId: entry.orderId, entryId: entry.id });
      await reloadStage();
      setNotice('Entry deleted.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function openEntry() {
    const line = openLines[0];
    setEditing(null);
    setError('');
    setDraft((current) => ({
      ...current,
      ...blankDraft(),
      jobId: line?.jobId || '',
      lotId: line?.sourceLots?.[0]?.id || '',
    }));
    setEntryOpen(true);
  }

  async function putBack() {
    if (!chosen) return;
    setError('');
    setSaving(true);
    try {
      await productionApi.release({
        orderId: chosen.orderId,
        itemId: chosen.itemId,
        stage,
      });
      closeEntry();
      await reloadStage();
      setNotice('Material returned to store.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const openEntryRef = useRef(openEntry);
  openEntryRef.current = openEntry;

  useEffect(() => {
    if (!onEntryState) return undefined;
    onEntryState({
      canEnter,
      disabled: !openLines.length,
      open: () => openEntryRef.current(),
    });
    return () => onEntryState(null);
  }, [canEnter, openLines.length, onEntryState]);

  return (
    <>
      {error && !entryOpen ? <p className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">{error}</p> : null}
      {notice ? <p className="border-b border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-900">{notice}</p> : null}
      {!book && !error ? <p className="border-b border-stone-200 px-4 py-2 text-sm text-stone-500">Loading…</p> : null}
      {entryOpen ? (
        <>
          <form id={ENTRY_FORM} onSubmit={submitEntry} className="hidden" />
          <EntryBar
            columns={columns}
            draft={draft}
            form={form}
            chosen={chosen}
            editing={editing}
            machines={machines}
            isDelivery={isDelivery}
            fromTask={fromTask}
            saving={saving}
            error={error}
            onRelease={putBack}
          />
        </>
      ) : null}
      {columns ? (
        <PaperBook
          stage={stage}
          columns={columns}
          entries={entries}
          isAdmin={isAdmin}
          canChange={canEnter}
          onEdit={startEdit}
          onDelete={removeEntry}
          busy={saving}
          adding={adding}
          editingId={editingId}
          renderEntry={(cellAt) => <PaperEntryRow key="entry-row" columns={columns} cellAt={cellAt} {...rowProps} />}
        />
      ) : (
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full border-separate border-spacing-0 border-l border-t border-stone-300 text-sm">
            <thead className="sticky top-0 z-20">
              <tr>
                <th className={head}>No</th>
                <th className={head}>Date</th>
                <th className={head}>Order</th>
                <th className={head}>Customer code</th>
                {showCustomerName ? <th className={head}>Customer name</th> : null}
                <th className={head}>Product</th>
                <th className={head}>{isDelivery ? 'Sent' : 'Production'}</th>
                {isDelivery ? (
                  <>
                    <th className={head}>Who</th>
                    <th className={head}>Person</th>
                    <th className={head}>Vehicle</th>
                  </>
                ) : (
                  <>
                    <th className={head}>Used</th>
                    <th className={head}>Waste</th>
                    <th className={head}>From</th>
                  </>
                )}
                <th className={head}>Operator</th>
                {canEnter ? <th className={head} /> : null}
              </tr>
            </thead>
            <tbody>
              {adding ? <PlainEntryRow isDelivery={isDelivery} showCustomerName={showCustomerName} {...rowProps} /> : null}
              {entries.length === 0 ? (
                adding ? null : (
                  <tr>
                    <td className={`${cell} text-stone-500`} colSpan={10 + (canEnter ? 1 : 0) + (showCustomerName ? 1 : 0)}>
                      No entry on this stage yet.
                    </td>
                  </tr>
                )
              ) : (
                entries.map((entry, index) =>
                  entry.id === editingId ? (
                    <PlainEntryRow key={entry.id} isDelivery={isDelivery} showCustomerName={showCustomerName} {...rowProps} />
                  ) : (
                  <tr key={entry.id} className={index % 2 ? 'bg-[#fbf7ee]' : 'bg-white'}>
                    <td className={`${cell} text-stone-500`}>{index + 1}</td>
                    <td className={cell}>{formatDate(entry.workDate || entry.markedAt)}</td>
                    <td className={`${cell} font-semibold`}>
                      <Link to={isAdmin ? `/registers/${entry.orderId}` : `/sales-orders/${entry.orderId}`} className="hover:underline">
                        {entry.orderNumber}
                      </Link>
                    </td>
                    <td className={cell}>{entry.customerCode || '—'}</td>
                    {showCustomerName ? <td className={cell}>{entry.customerName || '—'}</td> : null}
                    <td className={cell}>{entry.product || '—'}</td>
                    <td className={`${cell} font-semibold`}>{qtyOf(entry.outputQty, entry.unit)}</td>
                    {isDelivery ? (
                      <>
                        <td className={cell}>{entry.deliveryPartner || '—'}</td>
                        <td className={cell}>{entry.handoverPerson || '—'}</td>
                        <td className={cell}>{entry.vehicleNumber || '—'}</td>
                      </>
                    ) : (
                      <>
                        <td className={cell}>{formatQty(entry.inputQty)}</td>
                        <td className={cell}>{entry.wasteQty ? formatQty(entry.wasteQty) : '—'}</td>
                        <td className={cell}>{entry.pickedLotName || '—'}</td>
                      </>
                    )}
                    <td className={cell}>{entry.markedByName || '—'}</td>
                    {canEnter ? <EntryActions entry={entry} onEdit={startEdit} onDelete={removeEntry} busy={saving} /> : null}
                  </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
