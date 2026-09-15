import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { downloadSalesOrderFile, salesOrdersApi } from '../api/salesOrders.api';
import { Grid, Section, inputClass } from '../components/ui/FormField';
import { PageHeader } from '../components/ui/PageHeader';
import { Tabs } from '../components/ui/Tabs';
import { useAuth } from '../context/AuthContext';
import { usePermission } from '../hooks/usePermission';
import { Badge, PriorityBadge, StatusBadge, badgeTones, stepTone, attachmentTone } from '../components/ui/Badge';
import {
  ATTACHMENT_KINDS,
  STEP_LABELS,
  canSeeCommercial,
  formatDate,
  formatMoney,
  routeHasCut,
  routeHasPrint,
  routeLabel,
  statusLabel,
} from '../lib/sales';

function Value({ label, children }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-steel">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm">{children || '—'}</p>
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
      <PageHeader
        title={order.number}
        subtitle={
          <>
            <StatusBadge status={order.status} label={statusLabel(order.status)} />
            <PriorityBadge priority={order.priority} />
            <span>{formatDate(order.orderDate)}</span>
          </>
        }
        backTo="/sales-orders"
        backLabel="Sales orders"
        extra={
            <Tabs tabs={tabs} value={activeTab} onChange={setTab} />
        }
        actions={
          <div className="flex flex-wrap gap-2">
            {canEditDraft ? (
              <Link to={`/sales-orders/${order.id}/edit`} className="rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-paper">
                Edit
              </Link>
            ) : null}
            {canSubmit ? (
              <button type="button" disabled={busy} onClick={() => run(() => salesOrdersApi.submit(id), 'Submitted for approval.')} className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-dark disabled:opacity-60">
                Submit
              </button>
            ) : null}
            {canApprove ? (
              <button type="button" disabled={busy} onClick={() => run(() => salesOrdersApi.approve(id), 'Sales order approved.')} className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-dark disabled:opacity-60">
                Approve
              </button>
            ) : null}
            {canPlan && !stageView ? (
              <button type="button" disabled={busy} onClick={() => run(() => salesOrdersApi.planProduction(id), 'Sent to the production floor.')} className="rounded-lg bg-ink px-3 py-1.5 text-sm font-medium text-paper hover:bg-accent disabled:opacity-60">
                Move to production
              </button>
            ) : null}
            {['production_planned', 'in_production', 'ready_for_dispatch', 'dispatched'].includes(order.status) ? (
              <Link to="/production" className="rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-paper">
                Open production floor
              </Link>
            ) : null}
            {canAdvance ? (
              <button type="button" disabled={busy} onClick={() => run(() => salesOrdersApi.advance(id), 'Sales order completed.')} className="rounded-lg bg-ink px-3 py-1.5 text-sm font-medium text-paper hover:bg-accent disabled:opacity-60">
                Mark completed
              </button>
            ) : null}
            {canCancel ? (
              <button type="button" disabled={busy} onClick={handleCancel} className="rounded-lg border border-line px-3 py-1.5 text-sm text-red-700 hover:bg-paper disabled:opacity-60">
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
                className="rounded-lg border border-line px-3 py-1.5 text-sm text-red-700 hover:bg-paper"
              >
                Delete
              </button>
            ) : null}
          </div>
        }
      />

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {notice ? <p className="text-sm text-emerald-700">{notice}</p> : null}

      {stageView && activeTab === 'work' ? (
        <div className="space-y-4">
          <Section title="Order">
            <Grid>
              <Value label="Customer">{customer.name}</Value>
              {order.deliveryDate ? <Value label="Delivery">{formatDate(order.deliveryDate)}</Value> : null}
              {order.deliveryLocation ? <Value label="Location">{order.deliveryLocation}</Value> : null}
              {order.deliveryInstructions ? <Value label="Instructions">{order.deliveryInstructions}</Value> : null}
            </Grid>
          </Section>
          {(order.items || []).map((item) => (
            <Section key={item.id} title={`${item.product} · ${item.quantity} ${item.unit}`}>
              {Object.entries(item.requirements || {}).map(([stage, req]) => (
                <div key={stage} className="mb-4 last:mb-0">
                  <p className="mb-2 text-sm font-medium capitalize">{stage} requirement</p>
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
          <Link to="/production" className="inline-flex rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-dark">
            Open production floor
          </Link>
        </div>
      ) : null}

      {!stageView && activeTab === 'order' ? (
      <>
      <Section title="Customer">
        <Grid>
          <Value label="Customer">{customer.name}</Value>
          <Value label="Company">{customer.companyName}</Value>
          <Value label="Code">{customer.code}</Value>
          <Value label="Contact">{customer.contactPerson}</Value>
          <Value label="Phone">{customer.mobile}</Value>
          <Value label="Email">{customer.email}</Value>
          <Value label="GST">{customer.gstNumber}</Value>
          <Value label="Price category">{customer.priceCategory}</Value>
        </Grid>
      </Section>

      <Section title="Order information">
        <Grid>
          <Value label="Order date">{formatDate(order.orderDate)}</Value>
          <Value label="Delivery date">{formatDate(order.deliveryDate)}</Value>
          <Value label="Priority">
            <PriorityBadge priority={order.priority} />
          </Value>
          <Value label="Status">
            <StatusBadge status={order.status} label={statusLabel(order.status)} />
          </Value>
          {showMoney ? (
            <>
              <Value label="Payment terms">{order.paymentTerms}</Value>
              <Value label="Payment method">{order.paymentMethod}</Value>
              <Value label="Credit days">{order.creditDays}</Value>
              <Value label="Advance">{formatMoney(order.advanceAmount)}</Value>
              <Value label="Remaining">{formatMoney(order.remainingAmount)}</Value>
              <Value label="Payment remarks">{order.paymentRemarks}</Value>
            </>
          ) : null}
          <Value label="Billing address">{order.billingAddress}</Value>
          <Value label="Shipping address">{order.shippingAddress}</Value>
          <Value label="Delivery location">{order.deliveryLocation}</Value>
          <Value label="Delivery instructions">{order.deliveryInstructions}</Value>
          <Value label="Remarks">{order.remarks}</Value>
        </Grid>
      </Section>
      </>
      ) : null}

      {activeTab === 'products' ? (
      <Section title="Products">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-paper">
              <tr>
                <th className="px-3 py-2 font-medium">Product</th>
                <th className="px-3 py-2 font-medium">Size</th>
                <th className="px-3 py-2 font-medium">Material</th>
                <th className="px-3 py-2 font-medium">Qty</th>
                <th className="px-3 py-2 font-medium">Route</th>
                {showMoney ? (
                  <>
                    <th className="px-3 py-2 font-medium">Rate</th>
                    <th className="px-3 py-2 font-medium">Amount</th>
                  </>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {(order.items || []).map((item) => (
                <tr key={item.id} className="border-t border-line">
                  <td className="px-3 py-2">
                    <p className="font-medium">{item.product}</p>
                    <p className="text-xs text-slate">{item.productCode}</p>
                  </td>
                  <td className="px-3 py-2">{item.size || '—'}</td>
                  <td className="px-3 py-2">{item.material || '—'}</td>
                  <td className="px-3 py-2">
                    {item.quantity} {item.unit}
                  </td>
                  <td className="px-3 py-2">{routeLabel(item.productionRoute)}</td>
                  {showMoney ? (
                    <>
                      <td className="px-3 py-2">{formatMoney(item.rate)}</td>
                      <td className="px-3 py-2">{formatMoney(item.amount)}</td>
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
      {(order.items || []).map((item, index) => (
        <Section key={item.id} title={`Manufacturing · ${item.product || `Product ${index + 1}`}`}>
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
        </Section>
      ))}

      <Section title="Customer instructions">
        <p className="whitespace-pre-wrap text-sm">{order.productionInstructions || '—'}</p>
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
              <label className="cursor-pointer rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-paper">
                Upload
                <input type="file" className="hidden" onChange={handleUpload} />
              </label>
            </div>
          ) : null
        }
      >
        {(order.attachments || []).length === 0 ? (
          <p className="text-sm text-slate">No attachments.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {order.attachments.map((attachment) => (
              <li key={attachment.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line px-3 py-2">
                <span>
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
            <Value label="Grand total">{formatMoney(order.grandTotal)}</Value>
          </Grid>
        </Section>
      ) : null}

      {activeTab === 'progress' ? (
      <Section title="Production progress">
        <div className="space-y-4">
          {(order.items || []).map((item) => (
            <div key={item.id}>
              <p className="mb-2 text-sm font-medium">
                {item.product} · {routeLabel(item.productionRoute)}
              </p>
              <ol className="flex flex-wrap gap-2">
                {(item.progress || []).map((step) => (
                  <li
                    key={step.step}
                    className={`rounded-full border px-3 py-1 text-xs ${
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
                <ul className="mt-2 space-y-1 text-xs text-slate">
                  {item.stageWork.map((work, workIndex) => (
                    <li key={`${work.stage}-${workIndex}`}>
                      {STEP_LABELS[work.stage] || work.stage}: in {work.inputQty} → out {work.outputQty}
                      {work.wasteQty ? ` · waste ${work.wasteQty}` : ''}
                      {work.pickedLotName ? ` · from ${work.pickedLotName}` : ''}
                      {work.deliveryPartner ? ` · ${work.deliveryPartner}` : ''}
                      {work.handoverPerson ? ` · ${work.handoverPerson}` : ''}
                      {work.vehicleNumber ? ` · ${work.vehicleNumber}` : ''}
                      {work.machineName ? ` · ${work.machineName}` : ''}
                      {work.operatorName ? ` · ${work.operatorName}` : ''}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </div>
      </Section>
      ) : null}
    </div>
  );
}
