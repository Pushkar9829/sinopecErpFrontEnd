import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { productionApi } from '../../api/production.api';
import { registersApi } from '../../api/registers.api';
import { Modal } from '../ui/Modal';
import { confirmAction } from '../ui/ConfirmHost';
import { useAuth } from '../../context/AuthContext';
import { OPERATOR_LABEL, STAGE_COLUMNS, bookColumns, frozenColumns, isSuperAdmin, orderValue, paperQuantities, savedValue, typedDetails } from '../../lib/registerBooks';
import { DELIVERY_PARTNERS, PRODUCTION_SHIFTS, formatDate, formatQty, toDateInput } from '../../lib/sales';

const cell = 'whitespace-nowrap border-b border-r border-stone-300 px-2 py-1.5 align-middle text-sm';
const head = 'whitespace-nowrap border-b border-r border-stone-400 bg-stone-100 px-2 py-1.5 text-left text-xs font-semibold uppercase tracking-wide text-stone-600';

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

const labelClass = 'block text-xs font-semibold uppercase tracking-wide text-stone-500';
const boxClass = 'mt-1 w-full rounded border border-stone-400 bg-white px-2.5 py-2 text-base font-normal text-ink outline-none focus:border-accent lg:text-sm';
const WEIGHT_KEYS = new Set(['weight', 'gross', 'tare', 'net']);

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

function EntryField({ label, wide = false, full = false, children }) {
  return (
    <label className={`block min-w-0 ${spanClass({ wide, full })}`}>
      <span className={labelClass}>{label}</span>
      {children}
    </label>
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

function PaperBook({ stage, columns, entries, isAdmin, canChange, onEdit, onDelete, busy }) {
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
          {entries.length === 0 ? (
            <tr>
              <td className={`${cell} text-stone-500`} colSpan={span}>
                No entry on this stage yet.
              </td>
            </tr>
          ) : (
            entries.map((entry, index) => (
              <tr key={entry.id} className={index % 2 ? 'bg-[#fbf7ee]' : 'bg-white'}>
                <td {...cellAt('no', 'text-stone-500')}>{index + 1}</td>
                <td {...cellAt('date')}>{formatDate(entry.workDate || entry.markedAt)}</td>
                {columns.map((column) => (
                  <td key={column.key} {...cellAt(column.key, column.key === 'orderNumber' ? 'font-semibold' : '')}>
                    {column.key === 'orderNumber' ? (
                      <Link to={isAdmin ? `/registers/${entry.orderId}` : `/sales-orders/${entry.orderId}`} className="hover:underline">
                        {savedValue(entry, column.key) || '—'}
                      </Link>
                    ) : (
                      savedValue(entry, column.key) || '—'
                    )}
                  </td>
                ))}
                <td className={cell}>{entry.markedByName || '—'}</td>
                {canChange ? <EntryActions entry={entry} onEdit={onEdit} onDelete={onDelete} busy={busy} /> : null}
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
  editing = null,
}) {
  const paperQty = columns ? paperQuantities(stage, draft.details) : null;
  const madeNow = paperQty ? paperQty.outputQty : Number(draft.outputQty);
  const wasteNow = paperQty ? paperQty.wasteQty : Number(draft.wasteQty) || 0;
  const pickedLot = (chosen?.sourceLots || []).find((lot) => lot.id === draft.lotId) || chosen?.sourceLots?.[0];
  const sourceUnit = editing ? '' : chosen?.pickup?.unit || pickedLot?.unit || chosen?.unit || '';
  const unitsDiffer = editing
    ? !isDelivery && Math.abs(Number(editing.inputQty) - (Number(editing.outputQty) + Number(editing.wasteQty || 0))) > 1e-6
    : Boolean(chosen) && !isDelivery && sourceUnit.toLowerCase() !== String(chosen.unit || '').toLowerCase();
  const usedOver =
    !isDelivery &&
    !unitsDiffer &&
    draft.inputQty !== '' &&
    Math.abs(Number(draft.inputQty) - (madeNow + wasteNow)) > 1e-6;
  const usedMissing = unitsDiffer && !(Number(draft.inputQty) > 0);
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

  const setTop = (key) => (event) => setDraft((current) => ({ ...current, [key]: event.target.value }));
  const paperFields = (columns || []).filter((column) => column.key !== 'orderNumber');
  const orderFields = paperFields.filter((column) => !column.edit);
  const weightFields = paperFields.filter((column) => column.edit && WEIGHT_KEYS.has(column.key));
  const lineFields = paperFields.filter((column) => column.edit && !WEIGHT_KEYS.has(column.key));

  function paperInput(column) {
    const value = draft.details?.[column.key] || '';
    const onChange = (event) => setField(column.key, event.target.value);
    if (column.choices) {
      return (
        <select value={value} onChange={onChange} className={boxClass}>
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
      return <textarea value={value} onChange={onChange} rows={3} placeholder="Write anything about this entry" className={boxClass} />;
    }
    const numeric = column.qty || WEIGHT_KEYS.has(column.key);
    return <input value={value} onChange={onChange} inputMode={numeric ? 'decimal' : 'text'} placeholder={numeric ? '0' : ''} className={boxClass} />;
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit entry' : 'New entry'} wide="entry">
      <form onSubmit={onSubmit} className="space-y-4">
        <EntrySection title="Entry">
          <EntryField label="Date">
            <input type="date" required value={draft.workDate} onChange={setTop('workDate')} className={boxClass} />
          </EntryField>
          {columns ? null : (
            <EntryField label="Shift">
              <select value={draft.shift} onChange={setTop('shift')} className={boxClass}>
                {PRODUCTION_SHIFTS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </EntryField>
          )}
          {editing ? (
            <ReadField
              label={columns?.find((column) => column.key === 'orderNumber')?.label || 'Order'}
              value={`${editing.orderNumber} — ${editing.product}`}
              wide
            />
          ) : (
            <EntryField label={columns?.find((column) => column.key === 'orderNumber')?.label || 'Order'} wide>
              <select required value={draft.jobId} onChange={(event) => chooseLine(event.target.value)} className={boxClass}>
                <option value="">{openLines.length ? 'Choose' : 'Nothing waiting'}</option>
                {openLines.map((line) => (
                  <option key={line.jobId} value={line.jobId}>
                    {line.orderNumber} — {line.product}
                  </option>
                ))}
              </select>
            </EntryField>
          )}
          {machines?.length ? (
            <EntryField label="Machine">
              <select value={draft.machineId || ''} onChange={setTop('machineId')} className={boxClass}>
                <option value="">{editing ? editing.machineName || 'Keep as is' : 'Choose'}</option>
                {machines.map((machine) => (
                  <option key={machine.id} value={machine.id}>
                    {machine.name}
                  </option>
                ))}
              </select>
            </EntryField>
          ) : null}
          {!editing && !chosen?.pickup && (chosen?.sourceLots || []).length ? (
            <EntryField label="Material" wide>
              <select value={draft.lotId || chosen.sourceLots[0]?.id || ''} onChange={setTop('lotId')} className={boxClass}>
                {chosen.sourceLots.map((lot) => (
                  <option key={lot.id} value={lot.id}>
                    {lot.name} — {formatQty(lot.quantity)} {lot.unit}
                  </option>
                ))}
              </select>
            </EntryField>
          ) : null}
        </EntrySection>

        {chosen?.pickup ? (
          <p className="flex flex-wrap items-center gap-2 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            <span>
              {formatQty(chosen.pickup.qty)} {chosen.pickup.unit} already taken for this line
              {chosen.pickup.lotName ? ` from ${chosen.pickup.lotName}` : ''}.
            </span>
            <button type="button" onClick={onRelease} disabled={saving} className="font-semibold underline disabled:opacity-50">
              Return to store
            </button>
          </p>
        ) : null}

        <EntrySection title="From the order" muted>
          {columns ? (
            orderFields.map((column) => <ReadField key={column.key} label={column.label} value={orderValue(chosen, column.key)} />)
          ) : (
            <>
              <ReadField label="Customer code" value={chosen?.customerCode} />
              {chosen?.customerName ? <ReadField label="Customer name" value={chosen.customerName} /> : null}
              <ReadField label="Product" value={chosen?.product} wide />
              {editing ? null : <ReadField label="Left" value={chosen ? qtyOf(chosen.remaining, chosen.unit) : ''} />}
            </>
          )}
          <ReadField label={columns ? OPERATOR_LABEL[stage] : 'Operator'} value={operatorName} />
        </EntrySection>

        {columns ? (
          <>
            {lineFields.length ? (
              <EntrySection title="Written on this line">
                {lineFields.map((column) => (
                  <EntryField key={column.key} label={column.label} full={Boolean(column.long)}>
                    {paperInput(column)}
                  </EntryField>
                ))}
              </EntrySection>
            ) : null}
            {weightFields.length ? (
              <EntrySection title="Weight">
                {weightFields.map((column) => (
                  <EntryField key={column.key} label={column.label}>
                    {paperInput(column)}
                  </EntryField>
                ))}
              </EntrySection>
            ) : null}
            {unitsDiffer ? (
              <EntrySection title="Material used">
                <EntryField label={sourceUnit ? `Used (${sourceUnit})` : 'Used'}>
                  <input type="number" required min="0" step="any" value={draft.inputQty} onChange={setTop('inputQty')} className={boxClass} />
                </EntryField>
              </EntrySection>
            ) : null}
          </>
        ) : (
          <EntrySection title={isDelivery ? 'Delivery' : 'Quantity'}>
            {isDelivery ? null : (
              <EntryField label={sourceUnit ? `Used (${sourceUnit})` : 'Used'}>
                <input type="number" required={unitsDiffer} min="0" step="any" value={draft.inputQty} onChange={setTop('inputQty')} className={boxClass} />
              </EntryField>
            )}
            <EntryField label="Production">
              <input
                type="number"
                required
                min="0"
                step="any"
                value={draft.outputQty}
                onChange={setTop('outputQty')}
                placeholder={chosen && !editing ? `Left ${formatQty(chosen.remaining)}` : ''}
                className={boxClass}
              />
            </EntryField>
            {isDelivery ? (
              <>
                <EntryField label="Who is sending">
                  <select required value={draft.deliveryPartner} onChange={setTop('deliveryPartner')} className={boxClass}>
                    <option value="">Choose</option>
                    {DELIVERY_PARTNERS.map((partner) => (
                      <option key={partner} value={partner}>
                        {partner}
                      </option>
                    ))}
                  </select>
                </EntryField>
                <EntryField label="Person">
                  <input required value={draft.handoverPerson} onChange={setTop('handoverPerson')} className={boxClass} />
                </EntryField>
                <EntryField label="Vehicle">
                  <input required value={draft.vehicleNumber} onChange={setTop('vehicleNumber')} className={boxClass} />
                </EntryField>
              </>
            ) : (
              <EntryField label="Waste">
                <input type="number" min="0" step="any" value={draft.wasteQty} onChange={setTop('wasteQty')} className={boxClass} />
              </EntryField>
            )}
          </EntrySection>
        )}

        {wasteBlocked ? <p className="text-sm text-red-800">Enter wastage as a number.</p> : null}
        {usedOver ? <p className="text-sm text-red-800">Used must equal made plus waste.</p> : null}
        {error ? <p className="text-sm text-red-800">{error}</p> : null}
        <div className="sticky bottom-0 -mx-3 -mb-3 flex items-center justify-end gap-2 border-t border-stone-300 bg-card px-3 py-3 sm:-mx-5 sm:-mb-5 sm:px-5 lg:static lg:mx-0 lg:mb-0 lg:bg-transparent lg:px-0 lg:pb-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded border border-stone-400 bg-white px-4 py-2.5 text-sm font-semibold text-stone-800 sm:flex-none lg:py-2"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !chosen || !(madeNow > 0) || deliveryBlocked || wasteBlocked || usedOver || usedMissing}
            className="flex-1 rounded bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 sm:flex-none lg:py-2"
          >
            {saving ? 'Saving…' : editing ? 'Save' : 'Enter'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function StageRegister({ stage, isAdmin, presetJob = '', operatorName = '', onConsumePreset, onEntryState }) {
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
  const editLine = editing
    ? {
        orderId: editing.orderId,
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
  const isDelivery = stage === 'delivery';
  const columns = bookColumns(stage, showCustomerName);

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
          shift: draft.shift || undefined,
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
    if (editing) {
      setEditing(null);
      return;
    }
    onConsumePreset?.();
  }

  function startEdit(entry) {
    const details = { ...(entry.details || {}) };
    if (stage === 'printing' || stage === 'cutting') details.quantity = String(entry.outputQty || '');
    if (stage === 'printing' && !details.wastage && entry.wasteQty) details.wastage = String(entry.wasteQty);
    const differ = Math.abs(Number(entry.inputQty) - (Number(entry.outputQty) + Number(entry.wasteQty || 0))) > 1e-6;
    setError('');
    setNotice('');
    setEditing(entry);
    setDraft({
      ...blankDraft(),
      jobId: 'edit',
      inputQty: differ ? String(entry.inputQty ?? '') : '',
      outputQty: String(entry.outputQty ?? ''),
      wasteQty: entry.wasteQty ? String(entry.wasteQty) : '',
      shift: entry.shift || todayShift(),
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
                <th className={head}>Production</th>
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
              {entries.length === 0 ? (
                <tr>
                    <td className={`${cell} text-stone-500`} colSpan={10 + (canEnter ? 1 : 0) + (showCustomerName ? 1 : 0)}>
                    No entry on this stage yet.
                  </td>
                </tr>
              ) : (
                entries.map((entry, index) => (
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
        editing={editing}
      />
    </>
  );
}
