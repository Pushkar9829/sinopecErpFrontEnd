import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { productionApi } from '../api/production.api';
import { EmptyState } from '../components/ui/EmptyState';
import { Field, Grid, inputClass } from '../components/ui/FormField';
import { PageHeader } from '../components/ui/PageHeader';
import { Tabs } from '../components/ui/Tabs';
import { Badge, PriorityBadge, panelTones, stepTone, valueTones } from '../components/ui/Badge';
import { usePermission } from '../hooks/usePermission';
import { DELIVERY_PARTNERS, PRODUCTION_SHIFTS, PRODUCTION_STAGES, STEP_LABELS, formatDate, formatQty, routeLabel, toDateInput } from '../lib/sales';

function Value({ label, children }) {
  if (children == null || children === '') return null;
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-steel">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm">{children}</p>
    </div>
  );
}

function stageGuide(stage) {
  const guides = {
    rolling: {
      listTitle: 'Waiting to roll',
      listEmpty: 'Work appears when an order is planned and raw material is in the store.',
      produced: 'Rolled',
      remaining: 'Still to roll',
      pickTitle: '1. Take granules from the store',
      pickHint: 'Pick a raw lot, then log what this shift rolled.',
      pickButton: 'Start rolling',
      workTitle: '2. Log this rolling shift',
      workButton: 'Save rolling',
      finishButton: 'Finish rolling',
      historyTitle: 'Already rolled',
      doneHint: 'Output goes to rolling inventory for the next stage.',
    },
    printing: {
      listTitle: 'Waiting to print',
      listEmpty: 'Work appears when rolling output is waiting in inventory.',
      produced: 'Printed',
      remaining: 'Still to print',
      pickTitle: '1. Take rolled film',
      pickHint: 'Pick rolling output, then log this printing shift.',
      pickButton: 'Start printing',
      workTitle: '2. Log this printing shift',
      workButton: 'Save printing',
      finishButton: 'Finish printing',
      historyTitle: 'Already printed',
      doneHint: 'Output goes to printing inventory for the next stage.',
    },
    cutting: {
      listTitle: 'Waiting to cut',
      listEmpty: 'Work appears when previous-stage output is waiting in inventory.',
      produced: 'Cut',
      remaining: 'Still to cut',
      pickTitle: '1. Take film to cut',
      pickHint: 'Pick previous-stage output, then log this cutting shift.',
      pickButton: 'Start cutting',
      workTitle: '2. Log this cutting shift',
      workButton: 'Save cutting',
      finishButton: 'Finish cutting',
      historyTitle: 'Already cut',
      doneHint: 'Output goes to cutting inventory for dispatch.',
    },
    dispatch: {
      listTitle: 'Ready to dispatch',
      listEmpty: 'Work appears when finished goods are waiting in inventory.',
      produced: 'Dispatched',
      remaining: 'Still to dispatch',
      pickTitle: '1. Take finished goods',
      pickHint: 'Pick previous-stage output, then move it into delivery.',
      pickButton: 'Start dispatch',
      workTitle: '2. Move to delivery',
      workButton: 'Save dispatch',
      finishButton: 'Finish dispatch',
      historyTitle: 'Already dispatched',
      doneHint: 'Dispatched lots wait on the Delivery tab to send out.',
    },
    delivery: {
      listTitle: 'Ready to send',
      listEmpty: 'Work appears after dispatch. Send a lot to mark it delivered.',
      produced: 'Delivered',
      remaining: 'Still to send',
      pickTitle: 'Send this lot',
      pickHint: 'Enter vehicle, person, and shipping partner, then send. The order moves to Delivered when the full quantity is sent.',
      pickButton: 'Send to delivered',
      historyTitle: 'Already sent',
      doneHint: 'This lot is marked delivered.',
    },
  };
  return guides[stage] || guides.rolling;
}

function RequirementPanel({ stage, req = {} }) {
  if (stage === 'rolling') {
    return (
      <Grid>
        <Value label="Product">{req.product}</Value>
        <Value label="Size">{req.size}</Value>
        <Value label="Order qty">{req.quantity ? `${req.quantity} ${req.unit || ''}` : ''}</Value>
        <Value label="Raw material">{req.rawMaterial}</Value>
        <Value label="Type / grade">{[req.materialType, req.materialGrade].filter(Boolean).join(' / ')}</Value>
        <Value label="Required weight">{req.requiredWeight}</Value>
        <Value label="Width × length">{[req.width, req.length].filter(Boolean).join(' × ')}</Value>
        <Value label="Thickness">{req.thickness}</Value>
        <Value label="Color">{req.color}</Value>
        <Value label="Roll">{[req.roll?.width, req.roll?.length, req.roll?.weight].filter(Boolean).join(' · ')}</Value>
        <Value label="Additives">{req.additives}</Value>
        <Value label="Special">{req.specialRequirements}</Value>
      </Grid>
    );
  }

  if (stage === 'printing') {
    return (
      <Grid>
        <Value label="Product">{req.product}</Value>
        <Value label="Size">{req.size}</Value>
        <Value label="Order qty">{req.quantity ? `${req.quantity} ${req.unit || ''}` : ''}</Value>
        <Value label="Artwork">{req.printing?.artwork}</Value>
        <Value label="Colours">{[req.printing?.colorCount, req.printing?.colors].filter(Boolean).join(' · ')}</Value>
        <Value label="Design">{req.printing?.design}</Value>
        <Value label="Impressions">{req.printing?.impressions}</Value>
        <Value label="Print need">{req.printing?.requirement}</Value>
        <Value label="Special">{req.specialRequirements}</Value>
      </Grid>
    );
  }

  if (stage === 'cutting') {
    return (
      <Grid>
        <Value label="Product">{req.product}</Value>
        <Value label="Size">{req.size}</Value>
        <Value label="Order qty">{req.quantity ? `${req.quantity} ${req.unit || ''}` : ''}</Value>
        <Value label="Bag">{[req.bag?.width, req.bag?.length, req.bag?.gusset].filter(Boolean).join(' · ')}</Value>
        <Value label="Holes">
          {req.holes?.required ? [req.holes.count, req.holes.type, req.holes.size, req.holes.position].filter(Boolean).join(' · ') : 'No'}
        </Value>
        <Value label="Tape">{req.tape?.required ? req.tape.type || 'Yes' : 'No'}</Value>
        <Value label="Special">{req.specialRequirements}</Value>
      </Grid>
    );
  }

  return (
    <Grid>
      <Value label="Product">{req.product}</Value>
      <Value label="Order qty">{req.quantity ? `${req.quantity} ${req.unit || ''}` : ''}</Value>
      <Value label="Customer">{req.customer}</Value>
      <Value label="Delivery date">{formatDate(req.deliveryDate)}</Value>
      <Value label="Location">{req.deliveryLocation}</Value>
      <Value label="Instructions">{req.deliveryInstructions}</Value>
    </Grid>
  );
}

function todayShift() {
  const hour = new Date().getHours();
  if (hour < 14) return 'morning';
  if (hour < 22) return 'afternoon';
  return 'night';
}

function jobFlag(job) {
  if (job.pickup?.qty) return 'working';
  if (job.readyQty) return 'ready';
  return 'waiting';
}

function StatCard({ label, value, tone = 'muted' }) {
  return (
    <div className={`rounded-lg border px-2 py-2 ${panelTones[tone] || panelTones.muted}`}>
      <p className="text-xs text-steel">{label}</p>
      <p className={`font-medium ${valueTones[tone] || valueTones.muted}`}>{value}</p>
    </div>
  );
}

export function ProductionFloor() {
  const { can } = usePermission();
  const canOpenOrder = can('sales:read') || can('production:read') || can('inventory:read');
  const [stage, setStage] = useState('');
  const [queue, setQueue] = useState({ stages: [], jobs: [], shifts: PRODUCTION_SHIFTS });
  const [machines, setMachines] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [work, setWork] = useState({
    machineId: '',
    inputQty: '',
    outputQty: '',
    wasteQty: '0',
    notes: '',
    shift: todayShift(),
    workDate: toDateInput(new Date()),
    vehicleNumber: '',
    handoverPerson: '',
    deliveryPartner: '',
  });
  const [pickQty, setPickQty] = useState({});
  const [pickingId, setPickingId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const selected = useMemo(() => queue.jobs.find((job) => job.id === selectedId) || null, [queue.jobs, selectedId]);
  const canWork = selected
    ? can('production:update') || can(PRODUCTION_STAGES.find((item) => item.id === selected.stage)?.update)
    : false;
  const remaining = selected?.progress?.remaining ?? selected?.quantity ?? 0;
  const produced = selected?.progress?.output ?? 0;
  const pickup = selected?.pickup || null;
  const sourceLots = selected?.sourceLots || [];
  const shifts = queue.shifts?.length ? queue.shifts : PRODUCTION_SHIFTS;
  const partners = queue.deliveryPartners?.length ? queue.deliveryPartners : DELIVERY_PARTNERS;
  const guide = stageGuide(stage || selected?.stage);
  const isDelivery = selected?.stage === 'delivery';
  const handoverReady = Boolean(work.deliveryPartner && work.handoverPerson.trim() && work.vehicleNumber.trim());

  async function load(nextStage) {
    const data = await productionApi.queue(nextStage);
    setQueue(data);
    setStage(data.stage);
    const list = await productionApi.machines(data.stage).catch(() => []);
    setMachines(list);
    setSelectedId((current) => {
      if (current && data.jobs.some((job) => job.id === current)) return current;
      return data.jobs[0]?.id || '';
    });
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    setWork((current) => ({
      ...current,
      machineId: '',
      inputQty: '',
      outputQty: '',
      wasteQty: '0',
      notes: '',
      shift: current.shift || todayShift(),
      workDate: current.workDate || toDateInput(new Date()),
      vehicleNumber: '',
      handoverPerson: '',
      deliveryPartner: '',
    }));
  }, [selected?.id]);

  useEffect(() => {
    const suggest = pickup ? String(Math.min(pickup.qty, remaining)) : '';
    setWork((current) => ({
      ...current,
      inputQty: suggest,
      outputQty: selected?.stage === 'dispatch' || selected?.stage === 'delivery' ? suggest : current.outputQty,
    }));
    const next = {};
    for (const lot of sourceLots) {
      next[lot.id] = String(Math.min(Number(lot.quantity) || 0, remaining || Number(lot.quantity) || 0));
    }
    setPickQty(next);
  }, [selected?.id, pickup?.qty, remaining, selected?.readyQty, selected?.stage]);

  async function changeStage(next) {
    setError('');
    setNotice('');
    try {
      await load(next);
    } catch (err) {
      setError(err.message);
    }
  }

  async function pickLot(lot) {
    if (!selected) return;
    const qty = Number(pickQty[lot.id]);
    setError('');
    setNotice('');
    setPickingId(lot.id);
    try {
      const payload = {
        orderId: selected.orderId,
        itemId: selected.itemId,
        stage: selected.stage,
        lotId: lot.id,
        qty,
      };
      if (selected.stage === 'delivery') {
        payload.vehicleNumber = work.vehicleNumber;
        payload.handoverPerson = work.handoverPerson;
        payload.deliveryPartner = work.deliveryPartner;
        payload.shift = work.shift;
        payload.workDate = work.workDate;
        payload.notes = work.notes;
      }
      await productionApi.pickup(payload);
      await load(stage);
      if (selected.stage === 'delivery') {
        const left = remaining - qty;
        setNotice(left > 0.0001 ? `Sent this lot. ${left} still left to deliver.` : 'Delivery finished. Order moved to Delivered.');
      } else {
        setNotice(`Marked ${formatQty(qty)} ${lot.unit} from “${lot.name}” for working.`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setPickingId('');
    }
  }

  async function returnPickup() {
    if (!selected) return;
    setError('');
    setNotice('');
    setBusy(true);
    try {
      await productionApi.release({
        orderId: selected.orderId,
        itemId: selected.itemId,
        stage: selected.stage,
      });
      await load(stage);
      setNotice('Returned the picked lot back to inventory.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveShift(event) {
    event.preventDefault();
    if (!selected) return;
    setError('');
    setNotice('');
    setBusy(true);
    try {
      await productionApi.complete({
        orderId: selected.orderId,
        itemId: selected.itemId,
        stage: selected.stage,
        machineId: work.machineId || undefined,
        inputQty: work.inputQty,
        outputQty: work.outputQty,
        wasteQty: work.wasteQty,
        shift: work.shift,
        workDate: work.workDate,
        notes: work.notes,
      });
      const used = Number(work.outputQty || work.inputQty) || 0;
      const left = remaining - used;
      await load(stage);
      setNotice(left > 0.0001 ? `Shift saved. ${left} still left on ${guide.remaining.toLowerCase()}.` : guide.doneHint);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-[calc(100dvh-2rem)] flex-col gap-4 overflow-hidden">
      <div className="shrink-0">
        <PageHeader
          title="Production floor"
          subtitle="Each tab is one station. Pick stock, do the work, then the next station can take it. Delivery sends a lot out and marks the order Delivered."
          extra={
            <Tabs
              tabs={(queue.stages.length ? queue.stages : PRODUCTION_STAGES).map((item) => ({
                id: item.id,
                label: item.label,
                count: item.count,
                tone: stepTone(item.id),
              }))}
              value={stage}
              onChange={changeStage}
            />
          }
        />
      </div>

      {error ? <p className="shrink-0 text-sm text-red-700">{error}</p> : null}
      {notice ? <p className="shrink-0 text-sm text-emerald-700">{notice}</p> : null}

      <div className="grid min-h-0 flex-1 gap-4 overflow-hidden lg:grid-cols-[22rem_1fr]">
        <aside className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-line bg-card">
          <p className="shrink-0 border-b border-line px-3 py-2 text-xs font-medium uppercase tracking-wide text-steel">
            {guide.listTitle}
          </p>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {queue.jobs.length === 0 ? (
              <EmptyState title="Nothing waiting" hint={guide.listEmpty} />
            ) : (
              queue.jobs.map((job) => {
                const flag = jobFlag(job);
                return (
                  <button
                    key={job.id}
                    type="button"
                    onClick={() => setSelectedId(job.id)}
                    className={`block w-full border-b border-line px-3 py-3 text-left border-l-4 ${
                      flag === 'working'
                        ? 'border-l-orange-600'
                        : flag === 'ready'
                          ? 'border-l-sky-600'
                          : 'border-l-transparent'
                    } ${
                      selectedId === job.id
                        ? flag === 'working'
                          ? 'bg-orange-50'
                          : flag === 'ready'
                            ? 'bg-sky-50'
                            : 'bg-paper'
                        : 'hover:bg-paper/70'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                        <p className="truncate text-sm font-medium">{job.number}</p>
                        {flag === 'working' ? <Badge tone="accent">Working</Badge> : null}
                        {flag === 'ready' ? <Badge tone="info">Ready</Badge> : null}
                      </div>
                      <PriorityBadge priority={job.priority} />
                    </div>
                    <p className="mt-1 text-sm">{job.product}</p>
                    <p className={`text-xs ${flag === 'working' ? 'text-orange-900' : flag === 'ready' ? 'text-sky-800' : 'text-slate'}`}>
                      {job.progress?.output || 0}/{job.quantity} {job.unit} {guide.produced.toLowerCase()}
                      {flag === 'working'
                        ? ` · ${formatQty(job.pickup.qty)} from ${job.pickup.fromStageLabel || 'store'}`
                        : flag === 'ready'
                          ? ` · ${formatQty(job.readyQty)} to pick`
                          : ''}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-line bg-card">
          {!selected ? (
            <EmptyState title="Pick a job" hint="Select a sales order on the left." />
          ) : (
            <>
              <div className="shrink-0 border-b border-line px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="flex flex-wrap items-center gap-2 font-medium">
                      {selected.number} · {selected.product}
                      {pickup ? <Badge tone="accent">Working</Badge> : selected.readyQty ? <Badge tone="info">Ready</Badge> : null}
                    </h2>
                    <p className="mt-0.5 text-sm text-slate">
                      {routeLabel(selected.productionRoute)} · due {formatDate(selected.deliveryDate)}
                    </p>
                  </div>
                  {canOpenOrder ? (
                    <Link to={`/sales-orders/${selected.orderId}`} className="text-sm text-ink hover:underline">
                      Full order
                    </Link>
                  ) : null}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
                  <StatCard label={guide.produced} tone="success" value={`${produced} / ${selected.quantity} ${selected.unit}`} />
                  <StatCard label={guide.remaining} tone="warning" value={`${remaining} ${selected.unit}`} />
                  <StatCard
                    label={isDelivery ? 'Ready to send' : pickup ? 'Marked for working' : 'Ready to pick'}
                    tone={pickup ? 'accent' : selected.readyQty ? 'info' : 'muted'}
                    value={
                      pickup
                        ? `${formatQty(pickup.qty)} ${pickup.unit}`
                        : selected.readyQty
                          ? `${formatQty(selected.readyQty)} ${selected.unit}`
                          : 'None yet'
                    }
                  />
                </div>
              </div>

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
                <div>
                  <p className="mb-2 text-sm font-medium">What this station needs</p>
                  <RequirementPanel stage={selected.stage} req={selected.requirements} />
                </div>

                {isDelivery ? (
                  <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                    <div>
                      <p className="text-sm font-medium text-emerald-900">{guide.pickTitle}</p>
                      <p className="mt-0.5 text-xs text-slate">{guide.pickHint}</p>
                    </div>
                    <Grid cols="sm:grid-cols-2 lg:grid-cols-3">
                      <Field label="Shipping partner">
                        <select
                          required
                          value={work.deliveryPartner}
                          onChange={(event) => setWork((current) => ({ ...current, deliveryPartner: event.target.value }))}
                          className={inputClass}
                          disabled={!canWork}
                        >
                          <option value="">In-house, Delhivery, or Customer</option>
                          {partners.map((partner) => (
                            <option key={partner} value={partner}>
                              {partner}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Person taking it">
                        <input
                          required
                          value={work.handoverPerson}
                          onChange={(event) => setWork((current) => ({ ...current, handoverPerson: event.target.value }))}
                          className={inputClass}
                          placeholder="Driver or customer name"
                          disabled={!canWork}
                        />
                      </Field>
                      <Field label="Vehicle number">
                        <input
                          required
                          value={work.vehicleNumber}
                          onChange={(event) => setWork((current) => ({ ...current, vehicleNumber: event.target.value }))}
                          className={inputClass}
                          placeholder="MH 12 AB 1234"
                          disabled={!canWork}
                        />
                      </Field>
                    </Grid>
                    {!handoverReady && canWork ? (
                      <p className="text-xs text-slate">Fill partner, person, and vehicle, then send a lot below.</p>
                    ) : null}
                  </div>
                ) : null}

                <div className="space-y-3 rounded-lg border border-line p-4">
                  {!isDelivery ? (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium">{guide.pickTitle}</p>
                      <p className="text-xs text-slate">{guide.pickHint}</p>
                    </div>
                  ) : (
                    <p className="text-sm font-medium">Lots waiting from dispatch</p>
                  )}

                  {pickup ? (
                    <div className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-3">
                      <p className="text-xs uppercase tracking-wide text-orange-900">Working now</p>
                      <p className="mt-1 font-medium text-ink">{pickup.lotName}</p>
                      <p className="mt-1 text-sm text-slate">
                        {formatQty(pickup.qty)} {pickup.unit} from {pickup.fromStageLabel}
                        {pickup.pickedByName ? ` · picked by ${pickup.pickedByName}` : ''}
                      </p>
                      {canWork ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={returnPickup}
                          className="mt-2 text-sm text-ink hover:underline disabled:opacity-60"
                        >
                          Return to inventory
                        </button>
                      ) : null}
                    </div>
                  ) : null}

                  {sourceLots.length ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-left text-sm">
                        <thead className="text-slate">
                          <tr>
                            <th className="py-1 pr-3 font-medium">Lot</th>
                            <th className="py-1 pr-3 font-medium">Available</th>
                            <th className="py-1 pr-3 font-medium">Qty</th>
                            <th className="py-1 font-medium"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {sourceLots.map((lot) => (
                            <tr key={lot.id} className="border-t border-line">
                              <td className="py-2 pr-3">
                                <p className="font-medium">{lot.name}</p>
                                {lot.notes ? <p className="text-xs text-slate">{lot.notes}</p> : null}
                              </td>
                              <td className={`py-2 pr-3 font-medium ${valueTones.info}`}>
                                {formatQty(lot.quantity)} {lot.unit}
                              </td>
                              <td className="py-2 pr-3">
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  max={lot.quantity}
                                  value={pickQty[lot.id] ?? ''}
                                  onChange={(event) =>
                                    setPickQty((current) => ({ ...current, [lot.id]: event.target.value }))
                                  }
                                  className={inputClass}
                                  disabled={!canWork}
                                />
                              </td>
                              <td className="py-2">
                                {canWork ? (
                                  <button
                                    type="button"
                                    disabled={
                                      busy ||
                                      pickingId === lot.id ||
                                      !(Number(pickQty[lot.id]) > 0) ||
                                      (isDelivery && !handoverReady)
                                    }
                                    onClick={() => pickLot(lot)}
                                    className="rounded-lg bg-ink px-3 py-1.5 text-sm font-medium text-paper hover:bg-slate disabled:opacity-60"
                                  >
                                    {pickingId === lot.id
                                      ? isDelivery
                                        ? 'Sending…'
                                        : 'Picking…'
                                      : isDelivery
                                        ? guide.pickButton
                                        : guide.pickButton}
                                  </button>
                                ) : null}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-slate">
                      {pickup
                        ? 'All available lots are already marked for working.'
                        : selected.previousStage
                          ? `No ${selected.previousStageLabel} output is waiting in inventory yet.`
                          : 'No matching raw material is in the store.'}
                    </p>
                  )}
                </div>

                {!isDelivery && canWork && pickup ? (
                  <form onSubmit={saveShift} className="space-y-3 rounded-lg border border-line p-4">
                    <p className="text-sm font-medium">{guide.workTitle}</p>
                    <Grid cols="sm:grid-cols-2 lg:grid-cols-4">
                      <Field label="Date">
                        <input
                          required
                          type="date"
                          value={work.workDate}
                          onChange={(event) => setWork((current) => ({ ...current, workDate: event.target.value }))}
                          className={inputClass}
                        />
                      </Field>
                      <Field label="Shift">
                        <select
                          value={work.shift}
                          onChange={(event) => setWork((current) => ({ ...current, shift: event.target.value }))}
                          className={inputClass}
                        >
                          {shifts.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                      </Field>
                      {machines.length ? (
                        <Field label="Machine">
                          <select
                            value={work.machineId}
                            onChange={(event) => setWork((current) => ({ ...current, machineId: event.target.value }))}
                            className={inputClass}
                          >
                            <option value="">Select machine</option>
                            {machines.map((machine) => (
                              <option key={machine.id} value={machine.id}>
                                {machine.name}
                                {machine.code ? ` (${machine.code})` : ''}
                              </option>
                            ))}
                          </select>
                        </Field>
                      ) : null}
                      <Field label={`Use from working lot (max ${formatQty(pickup.qty)})`}>
                        <input
                          required
                          type="number"
                          min="0"
                          step="any"
                          max={pickup.qty}
                          value={work.inputQty}
                          onChange={(event) => setWork((current) => ({ ...current, inputQty: event.target.value }))}
                          className={inputClass}
                        />
                      </Field>
                      <Field label={selected.stage === 'dispatch' ? 'Qty to delivery' : 'Output this shift'}>
                        <input
                          required
                          type="number"
                          min="0"
                          step="any"
                          max={remaining}
                          value={work.outputQty}
                          onChange={(event) => setWork((current) => ({ ...current, outputQty: event.target.value }))}
                          className={inputClass}
                        />
                      </Field>
                      {selected.stage === 'dispatch' ? null : (
                        <Field label="Waste">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={work.wasteQty}
                            onChange={(event) => setWork((current) => ({ ...current, wasteQty: event.target.value }))}
                            className={inputClass}
                          />
                        </Field>
                      )}
                      <Field label="Notes" className="sm:col-span-2">
                        <input
                          value={work.notes}
                          onChange={(event) => setWork((current) => ({ ...current, notes: event.target.value }))}
                          className={inputClass}
                          placeholder="Optional"
                        />
                      </Field>
                    </Grid>
                    <button
                      type="submit"
                      disabled={busy}
                      className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-dark disabled:opacity-60"
                    >
                      {busy
                        ? 'Saving…'
                        : remaining - (Number(work.outputQty) || 0) > 0.0001
                          ? guide.workButton
                          : guide.finishButton}
                    </button>
                  </form>
                ) : !isDelivery && canWork ? (
                  <p className="text-sm text-slate">Pick a lot above before you log this shift.</p>
                ) : !canWork ? (
                  <p className="text-sm text-slate">You can view this queue, but you cannot record work.</p>
                ) : null}

                {(selected.history || []).length ? (
                  <div>
                    <p className="mb-2 text-sm font-medium">{guide.historyTitle}</p>
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-paper text-slate">
                        <tr>
                          <th className="px-3 py-2 font-medium">Date</th>
                          {isDelivery ? null : <th className="px-3 py-2 font-medium">Shift</th>}
                          <th className="px-3 py-2 font-medium">From</th>
                          {isDelivery ? null : <th className="px-3 py-2 font-medium">In</th>}
                          <th className="px-3 py-2 font-medium">{isDelivery ? 'Sent' : 'Out'}</th>
                          {isDelivery ? null : <th className="px-3 py-2 font-medium">Waste</th>}
                          {isDelivery ? (
                            <>
                              <th className="px-3 py-2 font-medium">Partner</th>
                              <th className="px-3 py-2 font-medium">Person</th>
                              <th className="px-3 py-2 font-medium">Vehicle</th>
                            </>
                          ) : null}
                          <th className="px-3 py-2 font-medium">By</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selected.history.map((row, index) => (
                          <tr key={`${row.completedAt}-${index}`} className="border-t border-line">
                            <td className="px-3 py-2">{formatDate(row.workDate)}</td>
                            {isDelivery ? null : <td className="px-3 py-2 capitalize">{row.shift || '—'}</td>}
                            <td className="px-3 py-2">{row.pickedLotName || STEP_LABELS[row.fromStage] || row.fromStage || '—'}</td>
                            {isDelivery ? null : <td className="px-3 py-2">{row.inputQty}</td>}
                            <td className={`px-3 py-2 ${valueTones.success}`}>{row.outputQty}</td>
                            {isDelivery ? null : (
                              <td className={`px-3 py-2 ${row.wasteQty ? valueTones.warning : ''}`}>{row.wasteQty}</td>
                            )}
                            {isDelivery ? (
                              <>
                                <td className="px-3 py-2">{row.deliveryPartner || '—'}</td>
                                <td className="px-3 py-2">{row.handoverPerson || '—'}</td>
                                <td className="px-3 py-2">{row.vehicleNumber || '—'}</td>
                              </>
                            ) : null}
                            <td className="px-3 py-2">{row.operatorName || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
