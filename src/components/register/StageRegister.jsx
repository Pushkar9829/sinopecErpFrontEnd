import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { productionApi } from '../../api/production.api';
import { registersApi } from '../../api/registers.api';
import { Modal } from '../ui/Modal';
import { OPERATOR_LABEL, STAGE_COLUMNS, orderValue, paperQuantities, savedValue, typedDetails } from '../../lib/registerBooks';
import { DELIVERY_PARTNERS, PRODUCTION_SHIFTS, formatDate, formatQty, toDateInput } from '../../lib/sales';

const cell = 'whitespace-nowrap border border-stone-300 px-2 py-1.5 align-middle text-sm';
const head = 'whitespace-nowrap border border-stone-400 bg-stone-100 px-2 py-1.5 text-left text-xs font-semibold uppercase tracking-wide text-stone-600';

function todayShift() {
  const hour = new Date().getHours();
  if (hour < 14) return 'morning';
  if (hour < 22) return 'afternoon';
  return 'night';
}

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
  };
}

function labelClass() {
  return 'block text-[11px] font-semibold uppercase leading-tight tracking-wide text-stone-500';
}

const tight = 'w-full rounded border border-stone-400 bg-white px-1.5 py-0.5 text-sm font-normal text-ink outline-none focus:border-accent';
const NARROW_FIELDS = new Set([
  'beam',
  'tb',
  'micron',
  'colour',
  'width',
  'weight',
  'gross',
  'tare',
  'net',
  'quantity',
  'wastage',
  'gauge',
  'uv',
  'cuts',
  'disc',
  'knife',
  'productCode',
]);

function slotClass(key) {
  if (key === 'printDescription') return 'w-full';
  if (NARROW_FIELDS.has(key)) return 'w-[4.5rem]';
  if (key === 'order' || key === 'material') return 'w-44';
  if (key === 'date') return 'w-44 min-w-[11rem]';
  return 'w-32';
}

function PaperBook({ stage, columns, entries, isAdmin }) {
  const span = 3 + columns.length;

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className={head}>No</th>
            <th className={head}>Date</th>
            {columns.map((column) => (
              <th key={column.key} className={head}>
                {column.label}
              </th>
            ))}
            <th className={head}>{OPERATOR_LABEL[stage]}</th>
          </tr>
        </thead>
        <tbody>
          {entries.length === 0 ? (
            <tr>
              <td className={`${cell} text-stone-500`} colSpan={span}>
                No entry on this stage yet.
              </td>
            </tr>
          ) : (
            entries.map((entry, index) => (
              <tr key={entry.id} className={index % 2 ? 'bg-[#fbf7ee]' : 'bg-white'}>
                <td className={`${cell} text-stone-500`}>{index + 1}</td>
                <td className={cell}>{formatDate(entry.workDate || entry.markedAt)}</td>
                {columns.map((column) => (
                  <td key={column.key} className={column.key === 'orderNumber' ? `${cell} font-semibold` : cell}>
                    {column.key === 'orderNumber' && isAdmin ? (
                      <Link to={`/registers/${entry.orderId}`} className="hover:underline">
                        {savedValue(entry, column.key) || '—'}
                      </Link>
                    ) : (
                      savedValue(entry, column.key) || '—'
                    )}
                  </td>
                ))}
                <td className={cell}>{entry.markedByName || '—'}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function EntryModal({
  open,
  onClose,
  stage,
  columns,
  openLines,
  chosen,
  draft,
  setDraft,
  operatorName,
  saving,
  error,
  isDelivery,
  machines,
  onRelease,
  onSubmit,
}) {
  const paperQty = columns ? paperQuantities(stage, draft.details) : null;
  const madeNow = paperQty ? paperQty.outputQty : Number(draft.outputQty);
  const usedOver =
    !columns &&
    !isDelivery &&
    draft.inputQty !== '' &&
    Number(draft.inputQty) - (Number(draft.outputQty) + (Number(draft.wasteQty) || 0)) > 1e-6;
  const wasteBlocked = paperQty ? paperQty.wasteOk === false : false;
  const deliveryBlocked = isDelivery && (!draft.deliveryPartner || !draft.handoverPerson.trim() || !draft.vehicleNumber.trim());

  function setField(key, value) {
    setDraft((current) => ({
      ...current,
      details: { ...(current.details || {}), [key]: value },
    }));
  }

  function chooseLine(jobId) {
    const line = openLines.find((item) => item.jobId === jobId);
    setDraft((current) => ({
      ...current,
      jobId,
      lotId: line?.sourceLots?.[0]?.id || '',
      details: {},
    }));
  }

  return (
    <Modal open={open} onClose={onClose} title="New entry" wide={columns ? 'fit' : false}>
      <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-x-2 gap-y-1.5">
        <label className={slotClass('date')}>
          <span className={labelClass()}>Date</span>
          <input
            type="date"
            required
            value={draft.workDate}
            onChange={(event) => setDraft((current) => ({ ...current, workDate: event.target.value }))}
            className={`${tight} mt-0.5`}
          />
        </label>
        {columns ? null : (
          <label className={slotClass('shift')}>
            <span className={labelClass()}>Shift</span>
            <select
              value={draft.shift}
              onChange={(event) => setDraft((current) => ({ ...current, shift: event.target.value }))}
              className={`${tight} mt-0.5`}
            >
              {PRODUCTION_SHIFTS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className={slotClass('order')}>
          <span className={labelClass()}>{columns?.find((column) => column.key === 'orderNumber')?.label || 'Sales order'}</span>
          <select required value={draft.jobId} onChange={(event) => chooseLine(event.target.value)} className={`${tight} mt-0.5`}>
            <option value="">{openLines.length ? 'Choose' : 'Nothing waiting'}</option>
            {openLines.map((line) => (
              <option key={line.jobId} value={line.jobId}>
                {line.orderNumber} — {line.product}
              </option>
            ))}
          </select>
        </label>
        {machines?.length ? (
          <label className={slotClass('material')}>
            <span className={labelClass()}>Machine</span>
            <select
              value={draft.machineId || ''}
              onChange={(event) => setDraft((current) => ({ ...current, machineId: event.target.value }))}
              className={`${tight} mt-0.5`}
            >
              <option value="">Choose</option>
              {machines.map((machine) => (
                <option key={machine.id} value={machine.id}>
                  {machine.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {(chosen?.sourceLots || []).length ? (
          <label className={slotClass('material')}>
            <span className={labelClass()}>Material</span>
            <select
              value={draft.lotId || chosen.sourceLots[0]?.id || ''}
              onChange={(event) => setDraft((current) => ({ ...current, lotId: event.target.value }))}
              className={`${tight} mt-0.5`}
            >
              {chosen.sourceLots.map((lot) => (
                <option key={lot.id} value={lot.id}>
                  {lot.name} — {formatQty(lot.quantity)} {lot.unit}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {columns
          ? columns
              .filter((column) => column.key !== 'orderNumber')
              .map((column) =>
                column.edit ? (
                  <label key={column.key} className={slotClass(column.key)}>
                    <span className={labelClass()}>{column.label}</span>
                    {column.key === 'printDescription' ? (
                      <textarea
                        value={draft.details?.[column.key] || ''}
                        onChange={(event) => setField(column.key, event.target.value)}
                        rows={2}
                        className={`${tight} mt-0.5`}
                      />
                    ) : (
                      <input
                        value={draft.details?.[column.key] || ''}
                        onChange={(event) => setField(column.key, event.target.value)}
                        inputMode={column.qty || column.key === 'net' ? 'decimal' : 'text'}
                        placeholder={column.qty || column.key === 'net' ? 'number' : ''}
                        className={`${tight} mt-0.5`}
                      />
                    )}
                  </label>
                ) : (
                  <div key={column.key} className={slotClass(column.key)}>
                    <p className={labelClass()}>{column.label}</p>
                    <p className="mt-0.5 truncate text-sm text-stone-900">{orderValue(chosen, column.key) || '—'}</p>
                  </div>
                )
              )
          : (
            <>
              <div className={slotClass('party')}>
                <p className={labelClass()}>Party</p>
                <p className="mt-0.5 truncate text-sm text-stone-900">{chosen?.customerName || '—'}</p>
              </div>
              <div className={slotClass('product')}>
                <p className={labelClass()}>Product</p>
                <p className="mt-0.5 truncate text-sm text-stone-900">{chosen?.product || '—'}</p>
              </div>
              {isDelivery ? null : (
                <label className={slotClass('quantity')}>
                  <span className={labelClass()}>Used</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={draft.inputQty}
                    onChange={(event) => setDraft((current) => ({ ...current, inputQty: event.target.value }))}
                    className={`${tight} mt-0.5`}
                  />
                </label>
              )}
              <label className={slotClass('quantity')}>
                <span className={labelClass()}>Production</span>
                <input
                  type="number"
                  required
                  min="0"
                  step="any"
                  value={draft.outputQty}
                  onChange={(event) => setDraft((current) => ({ ...current, outputQty: event.target.value }))}
                  placeholder={chosen ? `Left ${formatQty(chosen.remaining)}` : ''}
                  className={`${tight} mt-0.5`}
                />
              </label>
              {isDelivery ? null : (
                <label className={slotClass('quantity')}>
                  <span className={labelClass()}>Waste</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={draft.wasteQty}
                    onChange={(event) => setDraft((current) => ({ ...current, wasteQty: event.target.value }))}
                    className={`${tight} mt-0.5`}
                  />
                </label>
              )}
              {isDelivery ? (
                <>
                  <label className={slotClass('party')}>
                    <span className={labelClass()}>Who is sending</span>
                    <select
                      required
                      value={draft.deliveryPartner}
                      onChange={(event) => setDraft((current) => ({ ...current, deliveryPartner: event.target.value }))}
                      className={`${tight} mt-0.5`}
                    >
                      <option value="">Choose</option>
                      {DELIVERY_PARTNERS.map((partner) => (
                        <option key={partner} value={partner}>
                          {partner}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={slotClass('shift')}>
                    <span className={labelClass()}>Person</span>
                    <input
                      required
                      value={draft.handoverPerson}
                      onChange={(event) => setDraft((current) => ({ ...current, handoverPerson: event.target.value }))}
                      className={`${tight} mt-0.5`}
                    />
                  </label>
                  <label className={slotClass('shift')}>
                    <span className={labelClass()}>Vehicle</span>
                    <input
                      required
                      value={draft.vehicleNumber}
                      onChange={(event) => setDraft((current) => ({ ...current, vehicleNumber: event.target.value }))}
                      className={`${tight} mt-0.5`}
                    />
                  </label>
                </>
              ) : null}
            </>
          )}
        <div className={slotClass('party')}>
          <p className={labelClass()}>{columns ? OPERATOR_LABEL[stage] : 'Operator'}</p>
          <p className="mt-0.5 truncate text-sm text-stone-900">{operatorName || '—'}</p>
        </div>
        {chosen?.pickup ? (
          <p className="flex w-full flex-wrap items-center gap-2 text-sm text-stone-700">
            <span>
              {formatQty(chosen.pickup.qty)} {chosen.pickup.unit} in hand
              {chosen.pickup.lotName ? ` from ${chosen.pickup.lotName}` : ''}.
            </span>
            <button type="button" onClick={onRelease} disabled={saving} className="font-semibold text-ink underline disabled:opacity-50">
              Put back
            </button>
          </p>
        ) : null}
        {wasteBlocked ? <p className="w-full text-sm text-red-800">Enter wastage as a number.</p> : null}
        {usedOver ? <p className="w-full text-sm text-red-800">Used cannot be more than made plus waste.</p> : null}
        {error ? <p className="w-full text-sm text-red-800">{error}</p> : null}
        <div className="flex w-full items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-sm border border-stone-400 bg-white px-3 py-1.5 text-sm font-semibold text-stone-800">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !chosen || !(madeNow > 0) || deliveryBlocked || wasteBlocked || usedOver}
            className="rounded-sm bg-stone-900 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Enter'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function StageRegister({ stage, isAdmin, presetJob = '', operatorName = '', onConsumePreset, onEntryState }) {
  const [book, setBook] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [entryOpen, setEntryOpen] = useState(false);
  const [machines, setMachines] = useState([]);
  const openedJob = useRef('');
  const [draft, setDraft] = useState({
    jobId: '',
    lotId: '',
    inputQty: '',
    outputQty: '',
    wasteQty: '',
    shift: todayShift(),
    workDate: toDateInput(new Date()),
    deliveryPartner: '',
    handoverPerson: '',
    vehicleNumber: '',
    machineId: '',
    details: {},
  });

  useEffect(() => {
    if (!stage || stage === 'dispatch' || stage === 'delivery') {
      setMachines([]);
      return;
    }
    productionApi.machines(stage).then(setMachines).catch(() => setMachines([]));
  }, [stage]);

  useEffect(() => {
    if (!stage) return;
    setError('');
    registersApi.stage(stage).then(setBook).catch((err) => setError(err.message));
  }, [stage]);

  useEffect(() => {
    setDraft((current) => ({
      ...current,
      ...blankDraft(),
    }));
    setNotice('');
    setEntryOpen(false);
  }, [stage]);

  useEffect(() => {
    if (!presetJob) openedJob.current = '';
  }, [presetJob]);

  useEffect(() => {
    if (!book || !presetJob || openedJob.current === presetJob) return;
    const line = (book.open || []).find((item) => item.jobId === presetJob && item.canMark);
    if (!line) {
      setNotice('Nothing is in store for this entry.');
      onConsumePreset?.();
      return;
    }
    openedJob.current = presetJob;
    setDraft((current) => ({
      ...current,
      jobId: presetJob,
      lotId: line.sourceLots?.[0]?.id || '',
    }));
    setEntryOpen(true);
  }, [book, presetJob]);

  const entries = [...(book?.entries || [])].sort(
    (a, b) => new Date(b.workDate || b.markedAt) - new Date(a.workDate || a.markedAt)
  );
  const openLines = (book?.open || []).filter((line) => line.canMark);
  const canEnter = Boolean(book?.canMark);
  const chosen = openLines.find((line) => line.jobId === draft.jobId) || null;
  const isDelivery = stage === 'delivery';
  const columns = STAGE_COLUMNS[stage] || null;

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
      await productionApi.enter({
        orderId: chosen.orderId,
        itemId: chosen.itemId,
        stage,
        outputQty: made,
        inputQty: isDelivery ? made : used,
        wasteQty: waste,
        lotId: draft.lotId || undefined,
        machineId: draft.machineId || undefined,
        workDate: draft.workDate,
        shift: draft.shift || todayShift(),
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
      await reloadStage();
      setNotice('Entered on this register and the production floor.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function closeEntry() {
    setEntryOpen(false);
    onConsumePreset?.();
  }

  function openEntry() {
    const line = openLines[0];
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
      setNotice('Material put back.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (!onEntryState) return undefined;
    onEntryState({
      canEnter,
      disabled: !openLines.length,
      open: () => openEntry(),
    });
    return () => onEntryState(null);
  }, [canEnter, openLines.length, onEntryState]);

  return (
    <>
      {error && !entryOpen ? <p className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">{error}</p> : null}
      {notice ? <p className="border-b border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-900">{notice}</p> : null}
      {columns ? (
        <PaperBook stage={stage} columns={columns} entries={entries} isAdmin={isAdmin} />
      ) : (
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className={head}>No</th>
                <th className={head}>Date</th>
                <th className={head}>Sales order</th>
                <th className={head}>Party</th>
                <th className={head}>Product</th>
                <th className={head}>Production</th>
                <th className={head}>Who</th>
                <th className={head}>Person</th>
                <th className={head}>Vehicle</th>
                <th className={head}>Operator</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                    <td className={`${cell} text-stone-500`} colSpan={10}>
                    No entry on this stage yet.
                  </td>
                </tr>
              ) : (
                entries.map((entry, index) => (
                  <tr key={entry.id} className={index % 2 ? 'bg-[#fbf7ee]' : 'bg-white'}>
                    <td className={`${cell} text-stone-500`}>{index + 1}</td>
                    <td className={cell}>{formatDate(entry.workDate || entry.markedAt)}</td>
                    <td className={`${cell} font-semibold`}>
                      {isAdmin ? (
                        <Link to={`/registers/${entry.orderId}`} className="hover:underline">
                          {entry.orderNumber}
                        </Link>
                      ) : (
                        entry.orderNumber
                      )}
                    </td>
                    <td className={cell}>{entry.customerName || '—'}</td>
                    <td className={cell}>{entry.product || '—'}</td>
                    <td className={`${cell} font-semibold`}>{qtyOf(entry.outputQty, entry.unit)}</td>
                    <td className={cell}>{entry.deliveryPartner || '—'}</td>
                    <td className={cell}>{entry.handoverPerson || '—'}</td>
                    <td className={cell}>{entry.vehicleNumber || '—'}</td>
                    <td className={cell}>{entry.markedByName || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      <EntryModal
        open={entryOpen}
        onClose={closeEntry}
        stage={stage}
        columns={columns}
        openLines={openLines}
        chosen={chosen}
        draft={draft}
        setDraft={setDraft}
        operatorName={operatorName}
        saving={saving}
        error={error}
        isDelivery={isDelivery}
        machines={machines}
        onRelease={putBack}
        onSubmit={submitEntry}
      />
    </>
  );
}
