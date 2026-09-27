import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { downloadSalesOrderFile, salesOrdersApi } from '../api/salesOrders.api';
import { BackButton } from '../components/ui/BackButton';
import { StepProgress } from '../components/ui/StepProgress';
import { Grid, Section, inputClass } from '../components/ui/FormField';
import { useAuth } from '../context/AuthContext';
import { usePermission } from '../hooks/usePermission';
import { Badge, PriorityBadge, StatusBadge, badgeTones, stepTone, attachmentTone } from '../components/ui/Badge';
import {
  ATTACHMENT_KINDS,
  STEP_LABELS,
  canSeeCommercial,
  formatDate,
  formatMoney,
  itemFromApi,
  itemToPayload,
  routeHasCut,
  routeHasPrint,
  routeLabel,
  statusLabel,
  toDateInput,
} from '../lib/sales';

const VIEW_BLOCKS = {
  customer: { shell: 'border-sky-300 bg-sky-50/80', title: 'text-sky-800', dot: 'bg-sky-600' },
  order: { shell: 'border-orange-300 bg-orange-50/80', title: 'text-orange-800', dot: 'bg-orange-600' },
  payment: { shell: 'border-emerald-300 bg-emerald-50/80', title: 'text-emerald-800', dot: 'bg-emerald-600' },
  delivery: { shell: 'border-teal-300 bg-teal-50/80', title: 'text-teal-800', dot: 'bg-teal-600' },
};

const PRODUCT_TONES = [
  { shell: 'border-orange-300 bg-orange-50/80', title: 'text-orange-800', dot: 'bg-orange-600' },
  { shell: 'border-sky-300 bg-sky-50/80', title: 'text-sky-800', dot: 'bg-sky-600' },
  { shell: 'border-violet-300 bg-violet-50/80', title: 'text-violet-800', dot: 'bg-violet-600' },
  { shell: 'border-teal-300 bg-teal-50/80', title: 'text-teal-800', dot: 'bg-teal-600' },
  { shell: 'border-emerald-300 bg-emerald-50/80', title: 'text-emerald-800', dot: 'bg-emerald-600' },
  { shell: 'border-amber-300 bg-amber-50/80', title: 'text-amber-900', dot: 'bg-amber-500' },
];

function Fold({ title, tone, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={`overflow-hidden rounded-xl border-2 ${tone.shell}`}>
      <button type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="flex w-full items-center gap-2 px-4 py-3 text-left">
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${tone.dot}`} />
        <h2 className={`min-w-0 flex-1 truncate text-lg font-semibold ${tone.title}`}>{title}</h2>
        <svg viewBox="0 0 20 20" className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open ? <div className="border-t border-line/70 bg-card px-4 py-4">{children}</div> : null}
    </section>
  );
}

function Value({ label, children, strong = false }) {
  const empty = children == null || children === '';
  return (
    <div>
      <p className="text-base font-semibold text-ink">{label}</p>
      <div className={`mt-1 whitespace-pre-wrap text-base ${strong ? 'font-semibold text-ink' : 'font-normal text-ink'}`}>
        {empty ? <span className="font-normal text-slate">—</span> : children}
      </div>
    </div>
  );
}

export function SalesOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { can } = usePermission();
  const showMoney = canSeeCommercial(can);
  const isSuperAdmin = user?.role?.slug === 'super_admin';

  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [kind, setKind] = useState('po');
  const [tab, setTab] = useState('order');

  async function load() {
    setOrder(await salesOrdersApi.get(id));
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function run(action, success) {
    setError('');
    setNotice('');
    setBusy(true);
    try {
      await action();
      await load();
      if (success) setNotice(success);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel() {
    const reason = window.prompt('Cancel this sales order? You can add a reason.');
    if (reason === null) return;
    await run(() => salesOrdersApi.cancel(id, reason), 'Sales order cancelled.');
  }

  async function handleUpload(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    await run(() => salesOrdersApi.addAttachment(id, file, kind), 'Attachment added.');
  }

  if (!order && !error) {
    return <p className="text-sm text-slate">Loading sales order…</p>;
  }
  if (!order) {
    return <p className="text-sm text-red-700">{error}</p>;
  }

  const customer = order.customer || {};
  const canEditDraft = order.status === 'draft' && can('sales:update');
  const canSubmit = order.status === 'draft' && can('sales:update');
  const canApprove = order.status === 'submitted' && isSuperAdmin;
  const canPlan = order.status === 'approved' && can('production:update');
  const canAdvance = order.status === 'delivered' && can('production:update');
  const canCancel =
    order.status !== 'cancelled' &&
    order.status !== 'completed' &&
    order.status !== 'delivered' &&
    ((['draft', 'submitted'].includes(order.status) && can('sales:update')) ||
      (!['draft', 'submitted'].includes(order.status) && (can('production:update') || isSuperAdmin)));
  const canAttach = can('sales:update') && !['cancelled', 'completed', 'dispatched', 'delivered'].includes(order.status);
  const canDelete = order.status === 'draft' && can('sales:delete');
  const canDuplicate = can('sales:create');
  const stageView = order.viewMode === 'stage';

  const tabs = stageView
    ? [
        { id: 'work', label: 'Your stage', tone: 'accent' },
        { id: 'progress', label: 'Progress', tone: 'teal' },
      ]
    : [
        { id: 'order', label: 'Order', tone: 'info' },
        { id: 'products', label: 'Products', count: order.items?.length || 0, tone: 'accent' },
        { id: 'manufacturing', label: 'Manufacturing', tone: 'warning' },
        { id: 'documents', label: 'Documents', count: order.attachments?.length || 0, tone: 'purple' },
        ...(showMoney ? [{ id: 'amounts', label: 'Amounts', tone: 'success' }] : []),
        { id: 'progress', label: 'Progress', tone: 'teal' },
      ];

  const activeTab = tabs.some((item) => item.id === tab) ? tab : tabs[0].id;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-card px-3 py-2">
        <BackButton fallback="/sales-orders" />
        <h1 className="px-1 text-lg font-semibold">{order.number}</h1>
        <StatusBadge status={order.status} label={statusLabel(order.status)} />
        <PriorityBadge priority={order.priority} />
        <span className="text-sm text-slate">{formatDate(order.orderDate)}</span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
            {canDuplicate ? (
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  setError('');
                  setBusy(true);
                  try {
                    const created = await salesOrdersApi.create({
                      customerId: order.customer?.id,
                      orderDate: toDateInput(new Date()),
                      deliveryDate: toDateInput(order.deliveryDate),
                      priority: order.priority,
                      paymentTerms: order.paymentTerms,
                      paymentMethod: order.paymentMethod,
                      creditDays: order.creditDays,
                      advanceAmount: order.advanceAmount,
                      paymentRemarks: order.paymentRemarks,
                      billingAddress: order.billingAddress,
                      shippingAddress: order.shippingAddress,
                      deliveryLocation: order.deliveryLocation,
                      deliveryInstructions: order.deliveryInstructions,
                      remarks: order.remarks,
                      productionInstructions: order.productionInstructions,
                      discount: order.discount,
                      items: (order.items || []).map((item) => itemToPayload(itemFromApi(item))),
                    });
                    navigate(`/sales-orders/${created.id}`);
                  } catch (err) {
                    setError(err.message);
                    setBusy(false);
                  }
                }}
                className="inline-flex items-center rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-semibold text-ink hover:bg-paper disabled:opacity-60"
              >
                Duplicate
              </button>
            ) : null}
            {canEditDraft ? (
              <Link to={`/sales-orders/${order.id}/edit`} className="inline-flex items-center rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-semibold text-ink hover:bg-paper">
                Edit
              </Link>
            ) : null}
            {canSubmit ? (
              <button type="button" disabled={busy} onClick={() => run(() => salesOrdersApi.submit(id), 'Submitted for approval.')} className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent-dark disabled:opacity-60">
                Submit
              </button>
            ) : null}
            {canApprove ? (
              <button type="button" disabled={busy} onClick={() => run(() => salesOrdersApi.approve(id), 'Sales order approved.')} className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent-dark disabled:opacity-60">
                Approve
              </button>
            ) : null}
            {canPlan && !stageView ? (
              <button type="button" disabled={busy} onClick={() => run(() => salesOrdersApi.planProduction(id), 'Sent to the production floor.')} className="rounded-lg bg-ink px-3 py-1.5 text-sm font-semibold text-paper hover:bg-accent disabled:opacity-60">
                Move to production
              </button>
            ) : null}
            {['production_planned', 'in_production', 'ready_for_packing', 'packed', 'ready_for_dispatch', 'dispatched', 'delivered', 'completed'].includes(order.status) ? (
              <Link to={`/registers/${order.id}`} className="inline-flex items-center rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-semibold text-ink hover:bg-paper">
                Open register
              </Link>
            ) : null}
            {canAdvance ? (
              <button type="button" disabled={busy} onClick={() => run(() => salesOrdersApi.advance(id), 'Sales order completed.')} className="rounded-lg bg-ink px-3 py-1.5 text-sm font-semibold text-paper hover:bg-accent disabled:opacity-60">
                Mark completed
              </button>
            ) : null}
            {canCancel ? (
              <button type="button" disabled={busy} onClick={handleCancel} className="inline-flex items-center rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60">
                Cancel
              </button>
            ) : null}
            {canDelete ? (
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  if (!window.confirm('Delete this draft?')) return;
                  setBusy(true);
                  try {
                    await salesOrdersApi.remove(id);
                    navigate('/sales-orders');
                  } catch (err) {
                    setError(err.message);
                    setBusy(false);
                  }
                }}
                className="inline-flex items-center rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-50"
              >
                Delete
              </button>
            ) : null}
          </div>
      </div>

      <StepProgress steps={tabs} value={activeTab} onChange={setTab} />

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {notice ? <p className="text-sm text-emerald-700">{notice}</p> : null}

      {stageView && activeTab === 'work' ? (
        <div className="space-y-4">
          <Section title="Order">
            <Grid>
              <Value label="Customer" strong>{customer.name}</Value>
              {order.deliveryDate ? <Value label="Delivery">{formatDate(order.deliveryDate)}</Value> : null}
              {order.deliveryLocation ? <Value label="Location">{order.deliveryLocation}</Value> : null}
              {order.deliveryInstructions ? <Value label="Instructions">{order.deliveryInstructions}</Value> : null}
            </Grid>
          </Section>
          {(order.items || []).map((item) => (
            <Section key={item.id} title={`${item.product} · ${item.quantity} ${item.unit}`}>
              {Object.entries(item.requirements || {}).map(([stage, req]) => (
                <div key={stage} className="mb-4 last:mb-0">
                  <p className="mb-2 text-base font-semibold capitalize text-ink">{stage} requirement</p>
                  <Grid>
                    <Value label="Size">{req.size}</Value>
                    <Value label="Produced">{req.produced != null ? `${req.produced} / ${req.quantity}` : ''}</Value>
                    <Value label="Still to make">{req.remaining}</Value>
                    {req.rawMaterial ? <Value label="Raw material">{req.rawMaterial}</Value> : null}
                    {req.requiredWeight ? <Value label="Required weight">{req.requiredWeight}</Value> : null}
                    {req.roll ? <Value label="Roll">{[req.roll.width, req.roll.length, req.roll.weight].filter(Boolean).join(' · ')}</Value> : null}
                    {req.printing ? <Value label="Print">{[req.printing.colors, req.printing.design, req.printing.artwork].filter(Boolean).join(' · ')}</Value> : null}
                    {req.bag ? <Value label="Bag">{[req.bag.width, req.bag.length, req.bag.gusset].filter(Boolean).join(' · ')}</Value> : null}
                    {req.holes?.required ? <Value label="Holes">{[req.holes.count, req.holes.type].filter(Boolean).join(' · ')}</Value> : null}
                    {req.specialRequirements ? <Value label="Special">{req.specialRequirements}</Value> : null}
                    {req.incomingOutput ? (
                      <Value label="From previous inventory">{`${req.incomingOutput.availableQty} ready from ${req.incomingOutput.stage}`}</Value>
                    ) : null}
                  </Grid>
                </div>
              ))}
            </Section>
          ))}
          <Link to={`/registers/${order.id}`} className="inline-flex rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent-dark">
            Open register
          </Link>
        </div>
      ) : null}

      {!stageView && activeTab === 'order' ? (
      <div className="space-y-4">
      <Fold title="Customer" tone={VIEW_BLOCKS.customer}>
        <Grid>
          <Value label="Name" strong>{customer.name}</Value>
          <Value label="Company">{customer.companyName}</Value>
          <Value label="Code">{customer.code}</Value>
          <Value label="Contact">{customer.contactPerson}</Value>
          <Value label="Phone">{customer.mobile}</Value>
          <Value label="Email">{customer.email}</Value>
          <Value label="GST">{customer.gstNumber}</Value>
          <Value label="Price category">{customer.priceCategory}</Value>
        </Grid>
      </Fold>

      <Fold title="Order" tone={VIEW_BLOCKS.order}>
        <Grid>
          <Value label="Order date">{formatDate(order.orderDate)}</Value>
          <Value label="Delivery date">{formatDate(order.deliveryDate)}</Value>
          <Value label="Priority">
            <PriorityBadge priority={order.priority} />
          </Value>
          <Value label="Status">
            <StatusBadge status={order.status} label={statusLabel(order.status)} />
          </Value>
          <Value label="Remarks">{order.remarks}</Value>
        </Grid>
      </Fold>

      {showMoney ? (
        <Fold title="Payment" tone={VIEW_BLOCKS.payment}>
          <Grid>
            <Value label="Payment terms">{order.paymentTerms}</Value>
            <Value label="Payment method">{order.paymentMethod}</Value>
            <Value label="Credit days">{order.creditDays}</Value>
            <Value label="Advance">{formatMoney(order.advanceAmount)}</Value>
            <Value label="Remaining" strong>{formatMoney(order.remainingAmount)}</Value>
            <Value label="Payment remarks">{order.paymentRemarks}</Value>
          </Grid>
        </Fold>
      ) : null}

      <Fold title="Delivery" tone={VIEW_BLOCKS.delivery}>
        <Grid>
          <Value label="Billing address">{order.billingAddress}</Value>
          <Value label="Shipping address">{order.shippingAddress}</Value>
          <Value label="Delivery location">{order.deliveryLocation}</Value>
          <Value label="Delivery instructions">{order.deliveryInstructions}</Value>
        </Grid>
      </Fold>
      </div>
      ) : null}

      {activeTab === 'products' ? (
      <Section title="Products">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-paper">
              <tr>
                <th className="px-3 py-2 font-semibold">Product</th>
                <th className="px-3 py-2 font-semibold">Size</th>
                <th className="px-3 py-2 font-semibold">Material</th>
                <th className="px-3 py-2 font-semibold">Qty</th>
                <th className="px-3 py-2 font-semibold">Route</th>
                {showMoney ? (
                  <>
                    <th className="px-3 py-2 font-semibold">Rate</th>
                    <th className="px-3 py-2 font-semibold">Amount</th>
                  </>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {(order.items || []).map((item, index) => (
                <tr key={item.id} className="border-t border-line">
                  <td className="px-3 py-2">
                    <p className={`font-semibold ${PRODUCT_TONES[index % PRODUCT_TONES.length].title}`}>{item.product}</p>
                    <p className="text-sm font-normal text-slate">{item.productCode}</p>
                  </td>
                  <td className="px-3 py-2 font-normal text-ink">{item.size || '—'}</td>
                  <td className="px-3 py-2 font-normal text-slate">{item.material || '—'}</td>
                  <td className="px-3 py-2 font-semibold text-ink">
                    {item.quantity} {item.unit}
                  </td>
                  <td className="px-3 py-2 font-normal text-ink">{routeLabel(item.productionRoute)}</td>
                  {showMoney ? (
                    <>
                      <td className="px-3 py-2 font-normal text-ink">{formatMoney(item.rate)}</td>
                      <td className="px-3 py-2 font-semibold text-ink">{formatMoney(item.amount)}</td>
                    </>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
      ) : null}

      {activeTab === 'manufacturing' ? (
      <>
      {(order.items || []).map((item, index) => {
        const tone = PRODUCT_TONES[index % PRODUCT_TONES.length];
        const name = item.product || `Product ${index + 1}`;
        return (
        <Fold key={item.id} title={`${name} · Manufacturing`} tone={tone} defaultOpen={index === 0}>
          <Grid>
            <Value label="Raw material">{item.manufacturing?.rawMaterial}</Value>
            <Value label="Type / grade">
              {[item.manufacturing?.materialType, item.manufacturing?.materialGrade].filter(Boolean).join(' / ')}
            </Value>
            <Value label="Required weight">{item.manufacturing?.requiredWeight}</Value>
            <Value label="Required qty">{item.manufacturing?.requiredQuantity}</Value>
            <Value label="Thickness">{item.manufacturing?.thickness || item.thickness}</Value>
            <Value label="Color">{item.manufacturing?.color || item.color}</Value>
            <Value label="Roll size">{item.roll?.size || [item.roll?.width, item.roll?.length, item.roll?.weight].filter(Boolean).join(' · ')}</Value>
            {routeHasPrint(item.productionRoute) ? (
              <>
                <Value label="Printing">{[item.printing?.colorCount, item.printing?.colors, item.printing?.design].filter(Boolean).join(' · ')}</Value>
                <Value label="Impressions">{item.printing?.impressions}</Value>
                <Value label="Artwork">{item.printing?.artwork}</Value>
              </>
            ) : null}
            {routeHasCut(item.productionRoute) ? (
              <>
                <Value label="Poly bag size">{item.bag?.size || [item.bag?.width, item.bag?.length, item.bag?.gusset].filter(Boolean).join(' · ')}</Value>
                <Value label="Holes">
                  {item.holes?.required ? [item.holes.count, item.holes.type, item.holes.size, item.holes.position].filter(Boolean).join(' · ') : 'No'}
                </Value>
                <Value label="Tape">{item.tape?.required ? item.tape.type || 'Yes' : 'No'}</Value>
              </>
            ) : null}
            <Value label="Special requirements">{item.manufacturing?.specialRequirements}</Value>
            <Value label="Now at">{item.currentStage === 'completed' ? 'Done' : item.currentStage || 'Not started'}</Value>
          </Grid>
        </Fold>
        );
      })}

      <Section title="Customer instructions">
        <p className="whitespace-pre-wrap text-base font-normal text-ink">{order.productionInstructions || '—'}</p>
      </Section>
      </>
      ) : null}

      {activeTab === 'documents' ? (
      <Section
        title="Attachments"
        actions={
          canAttach ? (
            <div className="flex flex-wrap items-center gap-2">
              <select value={kind} onChange={(e) => setKind(e.target.value)} className={inputClass + ' mt-0 w-auto'}>
                {ATTACHMENT_KINDS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
              <label className="inline-flex cursor-pointer items-center rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-semibold text-ink hover:bg-paper">
                Upload
                <input type="file" className="hidden" onChange={handleUpload} />
              </label>
            </div>
          ) : null
        }
      >
        {(order.attachments || []).length === 0 ? (
          <p className="text-sm font-normal text-slate">No attachments.</p>
        ) : (
          <ul className="space-y-2 text-base">
            {order.attachments.map((attachment) => (
              <li key={attachment.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line px-3 py-2">
                <span className="font-semibold text-ink">
                  {attachment.originalName}
                  <Badge tone={attachmentTone(attachment.kind)} className="ml-2 normal-case">
                    {attachment.kind}
                  </Badge>
                </span>
                <span className="flex gap-3">
                  <button
                    type="button"
                    className="text-ink hover:underline"
                    onClick={() => downloadSalesOrderFile(order.id, attachment.id, attachment.originalName).catch((err) => setError(err.message))}
                  >
                    Download
                  </button>
                  {canAttach && ['draft', 'submitted'].includes(order.status) ? (
                    <button
                      type="button"
                      className="text-red-700 hover:underline"
                      onClick={() => run(() => salesOrdersApi.removeAttachment(order.id, attachment.id), 'Attachment removed.')}
                    >
                      Remove
                    </button>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>
      ) : null}

      {activeTab === 'amounts' && showMoney ? (
        <Section title="Amount">
          <Grid cols="sm:grid-cols-2 lg:grid-cols-4">
            <Value label="Subtotal">{formatMoney(order.subtotal)}</Value>
            <Value label="Discount">{formatMoney(order.discount)}</Value>
            <Value label="Tax">{formatMoney(order.tax)}</Value>
            <Value label="Grand total" strong>{formatMoney(order.grandTotal)}</Value>
          </Grid>
        </Section>
      ) : null}

      {activeTab === 'progress' ? (
      <div className="space-y-4">
        {(order.items || []).map((item, index) => {
          const tone = PRODUCT_TONES[index % PRODUCT_TONES.length];
          const name = item.product || `Product ${index + 1}`;
          return (
            <Fold key={item.id} title={`${name} · ${routeLabel(item.productionRoute)}`} tone={tone} defaultOpen={index === 0}>
              <ol className="flex flex-wrap gap-2">
                {(item.progress || []).map((step) => (
                  <li
                    key={step.step}
                    className={`rounded-full border px-3 py-1 text-sm font-semibold ${
                      step.done
                        ? badgeTones[stepTone(step.step)]
                        : item.currentStage === step.step
                          ? 'border-accent bg-orange-50 text-orange-900'
                          : 'border-line bg-paper text-slate'
                    }`}
                  >
                    {step.done ? '✓ ' : item.currentStage === step.step ? '→ ' : '○ '}
                    {STEP_LABELS[step.step] || step.step}
                    {step.target ? ` ${step.outputQty || 0}/${step.target}` : ''}
                  </li>
                ))}
              </ol>
              {(item.stageWork || []).length ? (
                <ul className="mt-3 space-y-2">
                  {item.stageWork.map((work, workIndex) => {
                    const detail = [
                      work.pickedLotName ? `from ${work.pickedLotName}` : '',
                      work.machineName || '',
                      work.deliveryPartner || '',
                      work.handoverPerson || '',
                      work.vehicleNumber || '',
                      work.operatorName && work.operatorName !== work.handoverPerson ? work.operatorName : '',
                    ].filter(Boolean);
                    return (
                      <li key={`${work.stage}-${workIndex}`} className="rounded-lg border border-line bg-paper/70 px-3 py-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone={stepTone(work.stage)}>{STEP_LABELS[work.stage] || work.stage}</Badge>
                          <span className="text-sm font-semibold text-ink">In {work.inputQty}</span>
                          <span className="text-sm font-semibold text-ink">Out {work.outputQty}</span>
                          {work.wasteQty ? <span className="text-sm font-normal text-slate">Waste {work.wasteQty}</span> : null}
                        </div>
                        {detail.length ? <p className="mt-1 text-sm font-normal text-slate">{detail.join(' · ')}</p> : null}
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </Fold>
          );
        })}
      </div>
      ) : null}
    </div>
  );
}
