import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BackButton } from '../components/ui/BackButton';
import { StageMenu } from '../components/ui/StageMenu';
import { productionApi } from '../api/production.api';
import { salesOrdersApi } from '../api/salesOrders.api';
import { usePermission } from '../hooks/usePermission';
import { DELIVERY_PARTNERS, PRODUCTION_SHIFTS, PRODUCTION_STAGES, formatDate, formatQty, routeStages, statusLabel, toDateInput } from '../lib/sales';

const BOOK = {
  rolling: {
    title: 'Rolling register',
    made: 'Made',
    left: 'Left',
    take: 'Take material',
    write: 'Write in book',
    empty: 'No order is waiting for rolling.',
    done: 'Rolling for this order is finished.',
  },
  printing: {
    title: 'Printing register',
    made: 'Printed',
    left: 'Left',
    take: 'Take roll',
    write: 'Write in book',
    empty: 'No roll is waiting for printing.',
    done: 'Printing for this order is finished.',
  },
  cutting: {
    title: 'Cutting register',
    made: 'Cut',
    left: 'Left',
    take: 'Take film',
    write: 'Write in book',
    empty: 'No film is waiting for cutting.',
    done: 'Cutting for this order is finished.',
  },
  dispatch: {
    title: 'Dispatch register',
    made: 'Sent inside',
    left: 'Left',
    take: 'Take goods',
    write: 'Write in book',
    empty: 'No goods are waiting for dispatch.',
    done: 'This order is ready for delivery.',
  },
  delivery: {
    title: 'Delivery register',
    made: 'Delivered',
    left: 'Left',
    take: 'Send out',
    write: 'Write in book',
    empty: 'Nothing is waiting to send.',
    done: 'This order is delivered.',
  },
};

function bookOf(stage) {
  return BOOK[stage] || BOOK.rolling;
}

function todayShift() {
  const hour = new Date().getHours();
  if (hour < 14) return 'morning';
  if (hour < 22) return 'afternoon';
  return 'night';
}

function specParts(stage, req = {}) {
  const qty = req.quantity ? `${formatQty(req.quantity)} ${req.unit || ''}`.trim() : '';
  if (stage === 'rolling') return [req.size, req.rawMaterial, req.thickness, req.color, qty].filter(Boolean);
  if (stage === 'printing') return [req.size, req.printing?.colors, req.printing?.artwork, qty].filter(Boolean);
  if (stage === 'cutting') return [req.size, [req.bag?.width, req.bag?.length].filter(Boolean).join(' × '), qty].filter(Boolean);
  return [req.customer, req.deliveryLocation, qty].filter(Boolean);
}

const cell = 'border border-stone-300 px-2 py-1.5 align-middle text-sm';
const head = 'border border-stone-400 bg-stone-100 px-2 py-1.5 text-left text-xs font-semibold uppercase tracking-wide text-stone-600';
const box = 'mt-1 w-full rounded-lg border border-stone-400 bg-white px-3 py-2 text-base font-normal text-ink outline-none focus:border-accent';

export function ProductionFloor() {
  const [searchParams] = useSearchParams();
  const { can } = usePermission();
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
  const [lotId, setLotId] = useState('');
  const [pickingId, setPickingId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [orderId, setOrderId] = useState('');

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
  const book = bookOf(stage || selected?.stage);
  const isDelivery = selected?.stage === 'delivery';
  const isDispatch = selected?.stage === 'dispatch';
  const handoverReady = Boolean(work.deliveryPartner && work.handoverPerson.trim() && work.vehicleNumber.trim());
  const chosenLot = sourceLots.find((lot) => lot.id === lotId) || sourceLots[0] || null;

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
    const requested = searchParams.get('stage') || undefined;
    const jobId = searchParams.get('job') || '';
    load(requested)
      .then(() => {
        if (jobId) setSelectedId(jobId);
      })
      .catch((err) => setError(err.message));
  }, [searchParams]);

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
    setLotId('');
  }, [selected?.id]);

  useEffect(() => {
    const suggest = pickup ? String(Math.min(pickup.qty, remaining)) : '';
    setWork((current) => ({
      ...current,
      inputQty: suggest,
      outputQty: selected?.stage === 'dispatch' || selected?.stage === 'delivery' ? suggest : current.outputQty,
    }));
    const lots = selected?.sourceLots || [];
    const next = {};
    for (const lot of lots) {
      next[lot.id] = String(Math.min(Number(lot.quantity) || 0, remaining || Number(lot.quantity) || 0));
    }
    setPickQty(next);
    setLotId((current) => (current && lots.some((lot) => lot.id === current) ? current : lots[0]?.id || ''));
  }, [selected?.id, pickup?.qty, remaining, selected?.readyQty, selected?.stage, selected?.sourceLots]);

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
    if (!selected || !lot) return;
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
        setNotice(left > 0.0001 ? `Sent. ${formatQty(left)} still left.` : 'Sent. Order is delivered.');
      } else {
        setNotice('');
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
      setNotice('Material put back.');
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
      setNotice(left > 0.0001 ? `Written. ${formatQty(left)} still left.` : book.done);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const stages = queue.stages.length ? queue.stages : PRODUCTION_STAGES;
  const registerOnly = Boolean(searchParams.get('job'));
  const isAdminFloor = can('production:read') && !registerOnly;
  const pickedOrder = orders.find((order) => order.id === orderId) || null;
  const orderStageIds = useMemo(() => {
    const ids = [];
    for (const item of pickedOrder?.items || []) {
      for (const id of routeStages(item.productionRoute)) {
        if (!ids.includes(id)) ids.push(id);
      }
    }
    return ids;
  }, [pickedOrder]);
  const stageChoices = isAdminFloor && mode === 'orders' && orderStageIds.length
    ? PRODUCTION_STAGES.filter((item) => orderStageIds.includes(item.id))
    : stages;
  const visibleJobs = isAdminFloor && mode === 'orders' && orderId
    ? queue.jobs.filter((job) => job.orderId === orderId)
    : queue.jobs;
  const showJobTable = !registerOnly && (!isAdminFloor || mode === 'stages' || Boolean(orderId));

  useEffect(() => {
    if (!isAdminFloor || mode !== 'orders') return;
    salesOrdersApi.list().then(setOrders).catch((err) => setError(err.message));
  }, [isAdminFloor, mode]);

  useEffect(() => {
    if (!(isAdminFloor && mode === 'orders' && orderId)) return;
    const match = queue.jobs.filter((job) => job.orderId === orderId);
    setSelectedId((current) => (match.some((job) => job.id === current) ? current : match[0]?.id || ''));
  }, [queue.jobs, orderId, mode, isAdminFloor]);

  return (
    <div className="-mx-5 -my-4 flex h-dvh min-h-0 flex-col md:-mx-6">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-stone-800 bg-[#fffdf6]">
        <div className="flex items-center justify-between border-b-2 border-stone-800 bg-[#f6f1e4] px-4 py-2">
          {registerOnly ? (
            <BackButton fallback={`/?stage=${stage || 'rolling'}`} />
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {isAdminFloor ? (
                <div className="flex overflow-hidden rounded-sm border border-stone-800">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('orders');
                      setOrderId('');
                    }}
                    className={`px-3 py-1 text-sm font-semibold ${mode === 'orders' ? 'bg-stone-900 text-white' : 'bg-white text-stone-800'}`}
                  >
                    Sales order
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('stages');
                      setOrderId('');
                    }}
                    className={`px-3 py-1 text-sm font-semibold ${mode === 'stages' ? 'bg-stone-900 text-white' : 'bg-white text-stone-800'}`}
                  >
                    Stages
                  </button>
                </div>
              ) : null}
              {isAdminFloor && mode === 'orders' && orderId ? (
                <button type="button" onClick={() => setOrderId('')} className="text-sm font-semibold text-stone-800 underline">
                  All orders
                </button>
              ) : null}
              {!isAdminFloor || mode === 'stages' || orderId ? (
                <StageMenu
                  stages={stageChoices.map((item) => ({
                    ...item,
                    count: stages.find((row) => row.id === item.id)?.count,
                  }))}
                  value={stage}
                  onChange={changeStage}
                />
              ) : null}
            </div>
          )}
          <p className="text-sm font-semibold text-stone-900">{formatDate(new Date())}</p>
        </div>

        {error ? <p className="border-b border-red-200 bg-red-50 px-4 py-2 text-base text-red-800">{error}</p> : null}
        {notice ? <p className="border-b border-emerald-200 bg-emerald-50 px-4 py-2 text-base text-emerald-900">{notice}</p> : null}

        {isAdminFloor && mode === 'orders' && !orderId ? (
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className={head}>No</th>
                  <th className={head}>Order</th>
                  <th className={head}>Party</th>
                  <th className={head}>Status</th>
                  <th className={head}>Due</th>
                  <th className={head}>Lines</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td className={`${cell} text-stone-500`} colSpan={6}>
                      No sales orders.
                    </td>
                  </tr>
                ) : (
                  orders.map((order, index) => (
                    <tr
                      key={order.id}
                      onClick={() => {
                        const ids = [];
                        for (const item of order.items || []) {
                          for (const id of routeStages(item.productionRoute)) {
                            if (!ids.includes(id)) ids.push(id);
                          }
                        }
                        setOrderId(order.id);
                        changeStage(ids[0] || 'rolling');
                      }}
                      className={`cursor-pointer ${index % 2 ? 'bg-[#fbf7ee]' : 'bg-white'} hover:bg-amber-50`}
                    >
                      <td className={`${cell} w-12 text-stone-500`}>{index + 1}</td>
                      <td className={`${cell} font-semibold`}>{order.number}</td>
                      <td className={cell}>{order.customer?.name || '—'}</td>
                      <td className={cell}>{statusLabel(order.status)}</td>
                      <td className={cell}>{formatDate(order.deliveryDate)}</td>
                      <td className={cell}>{(order.items || []).length}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : null}

        {showJobTable ? (
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full table-fixed border-collapse text-sm">
            <thead>
              <tr>
                <th className={head}>No</th>
                <th className={head}>Order</th>
                <th className={head}>Party</th>
                <th className={head}>Item</th>
                <th className={head}>Order qty</th>
                <th className={head}>{book.made}</th>
                <th className={head}>{book.left}</th>
              </tr>
            </thead>
            <tbody>
              {visibleJobs.length === 0 ? (
                <tr>
                  <td className={`${cell} text-stone-500`} colSpan={7}>
                    {book.empty}
                  </td>
                </tr>
              ) : (
                visibleJobs.map((job, index) => {
                  const open = job.id === selectedId;
                  return (
                    <tr
                      key={job.id}
                      onClick={() => setSelectedId(job.id)}
                      className={`cursor-pointer ${open ? 'bg-amber-100' : index % 2 ? 'bg-[#fbf7ee]' : 'bg-white'} hover:bg-amber-50`}
                    >
                      <td className={`${cell} w-12 text-stone-500`}>{index + 1}</td>
                      <td className={`${cell} font-semibold`}>{job.number}</td>
                      <td className={cell}>{job.customer || '—'}</td>
                      <td className={cell}>{job.product}</td>
                      <td className={cell}>
                        {formatQty(job.quantity)} {job.unit}
                      </td>
                      <td className={cell}>{formatQty(job.progress?.output || 0)}</td>
                      <td className={`${cell} font-semibold`}>{formatQty(job.progress?.remaining ?? job.quantity)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        ) : null}

        {selected && (showJobTable || registerOnly) ? (
          <div className={`flex min-h-0 flex-1 flex-col overflow-auto bg-white ${registerOnly ? '' : 'border-t-4 border-double border-stone-800'}`}>
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-stone-300 px-4 py-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-red-800">Write this line</p>
                <p className="mt-1 truncate text-base font-semibold text-ink">
                  {selected.number}
                  <span className="font-normal text-stone-600"> · {selected.product}</span>
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {specParts(selected.stage, selected.requirements).map((part) => (
                    <span key={part} className="rounded-md border border-stone-200 bg-[#fff8ee] px-2 py-0.5 text-sm font-normal text-stone-700">
                      {part}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                <div>
                  <p className="text-xs font-semibold text-stone-500">{book.made}</p>
                  <p className="text-base font-semibold text-ink">{formatQty(produced)}</p>
                </div>
                <div className="hidden h-8 w-px bg-stone-200 sm:block" />
                <div>
                  <p className="text-xs font-semibold text-stone-500">{book.left}</p>
                  <p className="text-base font-semibold text-ink">{formatQty(remaining)} {selected.unit}</p>
                </div>
                {pickup && !isDelivery ? (
                  <>
                    <div className="hidden h-8 w-px bg-stone-200 sm:block" />
                    <div>
                      <p className="text-xs font-semibold text-amber-800">In hand</p>
                      <p className="text-base font-semibold text-ink">{formatQty(pickup.qty)} {pickup.unit}</p>
                      <p className="max-w-48 truncate text-sm font-normal text-stone-500">{pickup.lotName}</p>
                    </div>
                    {canWork ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={returnPickup}
                        className="inline-flex items-center rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-semibold text-ink hover:bg-paper disabled:opacity-50"
                      >
                        Put back
                      </button>
                    ) : null}
                  </>
                ) : null}
              </div>
            </div>

            {!canWork ? <p className="px-4 py-3 text-base text-stone-600">You can read this book. You cannot write in it.</p> : null}

            {isDelivery && canWork ? (
              <div className="grid gap-3 border-b border-stone-300 px-4 py-4 sm:grid-cols-3">
                <label className="text-sm font-semibold text-stone-800">
                  Who is sending
                  <select
                    value={work.deliveryPartner}
                    onChange={(event) => setWork((current) => ({ ...current, deliveryPartner: event.target.value }))}
                    className={box}
                  >
                    <option value="">Choose</option>
                    {partners.map((partner) => (
                      <option key={partner} value={partner}>
                        {partner}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-semibold text-stone-800">
                  Person name
                  <input
                    value={work.handoverPerson}
                    onChange={(event) => setWork((current) => ({ ...current, handoverPerson: event.target.value }))}
                    className={box}
                    placeholder="Name"
                  />
                </label>
                <label className="text-sm font-semibold text-stone-800">
                  Vehicle no.
                  <input
                    value={work.vehicleNumber}
                    onChange={(event) => setWork((current) => ({ ...current, vehicleNumber: event.target.value }))}
                    className={box}
                    placeholder="MH 12 AB 1234"
                  />
                </label>
              </div>
            ) : null}

            {canWork && !pickup ? (
              <div className="grid gap-3 border-b border-stone-300 px-4 py-4 md:grid-cols-[1fr_10rem_auto] md:items-end">
                <label className="text-sm font-semibold text-stone-800">
                  {isDelivery ? 'Lot to send' : 'Material'}
                  <select
                    value={chosenLot?.id || ''}
                    onChange={(event) => setLotId(event.target.value)}
                    className={box}
                    disabled={!sourceLots.length}
                  >
                    {sourceLots.length === 0 ? <option value="">Nothing in store</option> : null}
                    {sourceLots.map((lot) => (
                      <option key={lot.id} value={lot.id}>
                        {lot.name} — {formatQty(lot.quantity)} {lot.unit}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-semibold text-stone-800">
                  How much
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={chosenLot ? pickQty[chosenLot.id] ?? '' : ''}
                    onChange={(event) =>
                      chosenLot && setPickQty((current) => ({ ...current, [chosenLot.id]: event.target.value }))
                    }
                    className={box}
                    disabled={!chosenLot}
                  />
                </label>
                <button
                  type="button"
                  disabled={busy || !chosenLot || !(Number(pickQty[chosenLot?.id]) > 0) || (isDelivery && !handoverReady)}
                  onClick={() => pickLot(chosenLot)}
                  className="h-9 rounded-sm bg-stone-900 px-4 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {pickingId ? 'Saving…' : book.take}
                </button>
              </div>
            ) : null}

            {!isDelivery && canWork && pickup ? (
              <form onSubmit={saveShift} className="grid grid-cols-2 items-end gap-3 border-b border-stone-300 px-4 py-3 md:grid-cols-4 xl:grid-cols-8">
                <label className="text-sm font-semibold text-stone-800">
                  Date
                  <input
                    required
                    type="date"
                    value={work.workDate}
                    onChange={(event) => setWork((current) => ({ ...current, workDate: event.target.value }))}
                    className={box}
                  />
                </label>
                <label className="text-sm font-semibold text-stone-800">
                  Shift
                  <select
                    value={work.shift}
                    onChange={(event) => setWork((current) => ({ ...current, shift: event.target.value }))}
                    className={box}
                  >
                    {shifts.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                {machines.length ? (
                  <label className="text-sm font-semibold text-stone-800">
                    Machine
                    <select
                      value={work.machineId}
                      onChange={(event) => setWork((current) => ({ ...current, machineId: event.target.value }))}
                      className={box}
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
                <label className="text-sm font-semibold text-stone-800">
                  Used
                  <input
                    required
                    type="number"
                    min="0"
                    step="any"
                    max={pickup.qty}
                    value={work.inputQty}
                    onChange={(event) => setWork((current) => ({ ...current, inputQty: event.target.value }))}
                    className={box}
                  />
                </label>
                <label className="text-sm font-semibold text-stone-800">
                  {isDispatch ? 'Qty out' : 'Made'}
                  <input
                    required
                    type="number"
                    min="0"
                    step="any"
                    max={remaining}
                    value={work.outputQty}
                    onChange={(event) => setWork((current) => ({ ...current, outputQty: event.target.value }))}
                    className={box}
                  />
                </label>
                {isDispatch ? null : (
                  <label className="text-sm font-semibold text-stone-800">
                    Waste
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={work.wasteQty}
                      onChange={(event) => setWork((current) => ({ ...current, wasteQty: event.target.value }))}
                      className={box}
                    />
                  </label>
                )}
                <label className="text-sm font-semibold text-stone-800 xl:col-span-1">
                  Remark
                  <input
                    value={work.notes}
                    onChange={(event) => setWork((current) => ({ ...current, notes: event.target.value }))}
                    className={box}
                    placeholder="Optional"
                  />
                </label>
                <button
                  type="submit"
                  disabled={busy}
                  className="h-11 rounded-lg bg-[#9a3412] px-3 text-sm font-semibold text-white hover:bg-accent-dark disabled:opacity-50"
                >
                  {busy ? 'Saving…' : book.write}
                </button>
              </form>
            ) : !isDelivery && canWork ? (
              <p className="px-4 py-3 text-base text-stone-600">Take material first. Then write how much you made.</p>
            ) : null}

            {(selected.history || []).length ? (
              <div className="flex min-h-0 flex-1 flex-col border-t border-stone-300">
                <p className="bg-stone-100 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-stone-700">
                  Already written
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr>
                        <th className={head}>Date</th>
                        {isDelivery ? null : <th className={head}>Shift</th>}
                        <th className={head}>From</th>
                        {isDelivery ? null : <th className={head}>Used</th>}
                        <th className={head}>{isDelivery ? 'Sent' : 'Made'}</th>
                        {isDelivery ? null : <th className={head}>Waste</th>}
                        {isDelivery ? (
                          <>
                            <th className={head}>Who</th>
                            <th className={head}>Person</th>
                            <th className={head}>Vehicle</th>
                          </>
                        ) : null}
                        <th className={head}>By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.history.map((row, index) => (
                        <tr key={`${row.completedAt}-${index}`} className={index % 2 ? 'bg-[#fbf7ee]' : 'bg-white'}>
                          <td className={cell}>{formatDate(row.workDate)}</td>
                          {isDelivery ? null : <td className={`${cell} capitalize`}>{row.shift || '—'}</td>}
                          <td className={cell}>{row.pickedLotName || '—'}</td>
                          {isDelivery ? null : <td className={cell}>{formatQty(row.inputQty)}</td>}
                          <td className={`${cell} font-semibold`}>{formatQty(row.outputQty)}</td>
                          {isDelivery ? null : <td className={cell}>{formatQty(row.wasteQty)}</td>}
                          {isDelivery ? (
                            <>
                              <td className={cell}>{row.deliveryPartner || '—'}</td>
                              <td className={cell}>{row.handoverPerson || '—'}</td>
                              <td className={cell}>{row.vehicleNumber || '—'}</td>
                            </>
                          ) : null}
                          <td className={cell}>{row.operatorName || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
