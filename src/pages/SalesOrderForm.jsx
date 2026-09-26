import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { customersApi } from '../api/customers.api';
import { salesOrdersApi } from '../api/salesOrders.api';
import { salesSettingsApi } from '../api/salesSettings.api';
import { SalesOrderLineCard } from '../components/sales/SalesOrderLineCard';
import { BackButton } from '../components/ui/BackButton';
import { StepProgress, stepMark } from '../components/ui/StepProgress';
import { Field, Grid, Section, inputClass } from '../components/ui/FormField';
import { usePermission } from '../hooks/usePermission';
import {
  PAYMENT_METHODS,
  PAYMENT_TERMS,
  PRIORITIES,
  PRODUCTION_ROUTES,
  applyRoute,
  calcOrder,
  canSeeCommercial,
  emptyLineItem,
  formatMoney,
  itemFromApi,
  itemToPayload,
  toDateInput,
} from '../lib/sales';

function todayInput() {
  return toDateInput(new Date());
}

const FLOW_CHIPS = {
  roll_dispatch: { chip: 'border-orange-300 bg-orange-100 text-orange-900', dot: 'bg-orange-600' },
  roll_print_dispatch: { chip: 'border-sky-300 bg-sky-100 text-sky-800', dot: 'bg-sky-600' },
  roll_print_cut_dispatch: { chip: 'border-violet-300 bg-violet-100 text-violet-800', dot: 'bg-violet-600' },
  roll_cut_dispatch: { chip: 'border-teal-300 bg-teal-100 text-teal-800', dot: 'bg-teal-600' },
};

function PlusIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M10 4v12M4 10h12" strokeLinecap="round" />
    </svg>
  );
}

function FlowMenu({ disabled, onPick }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    function close() {
      setOpen(false);
    }
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [open]);

  return (
    <div className="relative" onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        disabled={disabled}
        aria-label="Set flow on all products"
        aria-expanded={open}
        onClick={() => setOpen((next) => !next)}
        className="inline-flex max-w-72 items-center gap-2 rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-semibold text-ink hover:bg-paper disabled:opacity-60"
      >
        <span className="truncate">Set flow on all products</span>
        <svg viewBox="0 0 20 20" className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open ? (
        <div className="absolute right-0 z-20 mt-1 w-80 rounded-lg border border-line bg-white p-1 shadow-md">
          {PRODUCTION_ROUTES.map((route) => {
            const tone = FLOW_CHIPS[route.id] || FLOW_CHIPS.roll_dispatch;
            return (
              <button
                key={route.id}
                type="button"
                onClick={() => {
                  onPick(route.id);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm font-semibold ${tone.chip}`}
              >
                <span className={`h-2 w-2 shrink-0 rounded-full ${tone.dot}`} />
                <span>{route.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

const emptyHeader = {
  customerId: '',
  orderDate: todayInput(),
  deliveryDate: '',
  priority: 'normal',
  paymentTerms: 'credit',
  paymentMethod: 'bank_transfer',
  creditDays: '30',
  advanceAmount: '0',
  paymentRemarks: '',
  billingAddress: '',
  shippingAddress: '',
  deliveryLocation: '',
  deliveryInstructions: '',
  remarks: '',
  productionInstructions: '',
  discount: '0',
};

export function SalesOrderForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = usePermission();
  const isEdit = Boolean(id);
  const canSave = isEdit ? can('sales:update') : can('sales:create');
  const showCommercial = canSeeCommercial(can);

  const [customers, setCustomers] = useState([]);
  const [header, setHeader] = useState(emptyHeader);
  const [items, setItems] = useState([emptyLineItem()]);
  const [number, setNumber] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(!isEdit);
  const [tab, setTab] = useState('order');
  const [templates, setTemplates] = useState([]);
  const [options, setOptions] = useState({});

  const selectedCustomer = customers.find((customer) => customer.id === header.customerId);
  const totals = useMemo(() => calcOrder(items, header.discount, header.advanceAmount), [items, header.discount, header.advanceAmount]);

  useEffect(() => {
    Promise.all([customersApi.list(), salesSettingsApi.listTemplates(), salesSettingsApi.options()])
      .then(([nextCustomers, nextTemplates, optionData]) => {
        setCustomers(nextCustomers);
        setTemplates(nextTemplates);
        setOptions(optionData.byGroup || {});
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!id) return;
    salesOrdersApi
      .get(id)
      .then((order) => {
        if (order.status !== 'draft') {
          navigate(`/sales-orders/${id}`, { replace: true });
          return;
        }
        setNumber(order.number);
        setHeader({
          customerId: order.customer?.id || '',
          orderDate: toDateInput(order.orderDate) || todayInput(),
          deliveryDate: toDateInput(order.deliveryDate),
          priority: order.priority || 'normal',
          paymentTerms: order.paymentTerms || 'credit',
          paymentMethod: order.paymentMethod || 'bank_transfer',
          creditDays: String(order.creditDays ?? 0),
          advanceAmount: String(order.advanceAmount ?? 0),
          paymentRemarks: order.paymentRemarks || '',
          billingAddress: order.billingAddress || '',
          shippingAddress: order.shippingAddress || '',
          deliveryLocation: order.deliveryLocation || '',
          deliveryInstructions: order.deliveryInstructions || '',
          remarks: order.remarks || '',
          productionInstructions: order.productionInstructions || '',
          discount: String(order.discount ?? 0),
        });
        setItems(order.items?.length ? order.items.map(itemFromApi) : [emptyLineItem()]);
        setLoaded(true);
      })
      .catch((err) => setError(err.message));
  }, [id, navigate]);

  function updateHeader(field, value) {
    setHeader((prev) => ({ ...prev, [field]: value }));
  }

  function applyCustomer(customerId) {
    const customer = customers.find((item) => item.id === customerId);
    setHeader((prev) => ({
      ...prev,
      customerId,
      billingAddress: customer?.billingAddress || prev.billingAddress,
      shippingAddress: customer?.shippingAddress || prev.shippingAddress,
      deliveryLocation: customer?.shippingAddress || customer?.billingAddress || prev.deliveryLocation,
    }));

    const attached = (customer?.products || []).map(itemFromApi);
    if (attached.length) {
      setItems(attached);
      setTab('products');
    } else if (!isEdit) {
      setItems([emptyLineItem()]);
    }
  }

  function payload() {
    return {
      ...header,
      creditDays: Number(header.creditDays) || 0,
      advanceAmount: Number(header.advanceAmount) || 0,
      discount: Number(header.discount) || 0,
      items: items.map(itemToPayload),
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!header.customerId) {
      setTab('order');
      setError('Select a customer');
      return;
    }
    if (!items.some((item) => item.product.trim())) {
      setTab('products');
      setError('Add at least one product');
      return;
    }
    setError('');
    setSaving(true);
    try {
      if (isEdit) {
        await salesOrdersApi.update(id, payload());
        navigate(`/sales-orders/${id}`);
      } else {
        const created = await salesOrdersApi.create(payload());
        navigate(`/sales-orders/${created.id}`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const steps = useMemo(
    () =>
      [
        { id: 'order', label: 'Order', hint: 'Customer & dates' },
        { id: 'products', label: 'Product', hint: 'Line items', count: items.length },
        { id: 'delivery', label: 'Delivery', hint: 'Address & payment' },
        ...(showCommercial ? [{ id: 'totals', label: 'Total', hint: 'Amounts' }] : []),
      ].map((step, index) => ({ ...step, number: index + 1 })),
    [items.length, showCommercial]
  );

  const stepIndex = Math.max(
    0,
    steps.findIndex((step) => step.id === tab)
  );
  const isFirstStep = stepIndex <= 0;
  const isLastStep = stepIndex >= steps.length - 1;

  function goStep(direction) {
    const next = steps[stepIndex + direction];
    if (next) setTab(next.id);
  }

  if (!loaded) {
    return <p className="text-sm text-slate">Loading sales order…</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-card px-3 py-2">
        <BackButton fallback={isEdit ? `/sales-orders/${id}` : '/sales-orders'} />
        <h1 className="px-1 text-lg font-semibold">{isEdit ? number || 'Sales order' : 'New sales order'}</h1>
      </div>

      <StepProgress steps={steps} value={tab} onChange={setTab} />

        {tab === 'order' ? (
        <>
        <Section title="Order" mark={{ ...stepMark('order'), number: steps.find((s) => s.id === 'order')?.number || 1 }}>
          <Grid>
            {isEdit ? (
              <Field label="Sales order no.">
                <input readOnly value={number} className={inputClass} />
              </Field>
            ) : (
              <Field label="Sales order no.">
                <input readOnly value="Assigned on save (SO-YYYY-00001)" className={inputClass} />
              </Field>
            )}
            <Field label="Order date">
              <input type="date" required value={header.orderDate} disabled={!canSave} onChange={(e) => updateHeader('orderDate', e.target.value)} className={inputClass} />
            </Field>
            <Field label="Customer">
              <select required value={header.customerId} disabled={!canSave} onChange={(e) => applyCustomer(e.target.value)} className={inputClass}>
                <option value="">Select customer</option>
                {customers
                  .filter((customer) => customer.isActive || customer.id === header.customerId)
                  .map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} ({customer.code})
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Customer code">
              <input readOnly value={selectedCustomer?.code || ''} className={inputClass} />
            </Field>
            <Field label="Delivery date">
              <input type="date" value={header.deliveryDate} disabled={!canSave} onChange={(e) => updateHeader('deliveryDate', e.target.value)} className={inputClass} />
            </Field>
            <Field label="Priority">
              <select value={header.priority} disabled={!canSave} onChange={(e) => updateHeader('priority', e.target.value)} className={inputClass}>
                {PRIORITIES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </Field>
          </Grid>
        </Section>

        {selectedCustomer ? (
          <Section title="Customer">
            <Grid>
              <Field label="Customer name">
                <input readOnly value={selectedCustomer.name} className={inputClass} />
              </Field>
              <Field label="Company">
                <input readOnly value={selectedCustomer.companyName} className={inputClass} />
              </Field>
              <Field label="Contact person">
                <input readOnly value={selectedCustomer.contactPerson} className={inputClass} />
              </Field>
              <Field label="Mobile">
                <input readOnly value={selectedCustomer.mobile} className={inputClass} />
              </Field>
              <Field label="Email">
                <input readOnly value={selectedCustomer.email} className={inputClass} />
              </Field>
              <Field label="GST">
                <input readOnly value={selectedCustomer.gstNumber} className={inputClass} />
              </Field>
              <Field label="Price category">
                <input readOnly value={selectedCustomer.priceCategory} className={inputClass} />
              </Field>
            </Grid>
          </Section>
        ) : null}
        </>
        ) : null}

        {tab === 'products' ? (
        <Section
          title="Product" mark={{ ...stepMark('products'), number: steps.find((s) => s.id === 'products')?.number || 2 }}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <FlowMenu
                disabled={!canSave}
                onPick={(route) => setItems((prev) => prev.map((item) => applyRoute(item, route)))}
              />
              {canSave ? (
                <button
                  type="button"
                  onClick={() => setItems((prev) => [...prev, emptyLineItem()])}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent-dark"
                >
                  <PlusIcon />
                  Add product
                </button>
              ) : null}
            </div>
          }
        >
          <div className="space-y-4">
            {items.map((item, index) => (
              <SalesOrderLineCard
                key={item.id || index}
                item={item}
                index={index}
                showCommercial={showCommercial}
                canEdit={canSave}
                templates={templates}
                options={options}
                removable={items.length > 1}
                onChange={(next) => setItems((prev) => prev.map((row, rowIndex) => (rowIndex === index ? next : row)))}
                onRemove={() => setItems((prev) => prev.filter((_, rowIndex) => rowIndex !== index))}
              />
            ))}
          </div>
        </Section>
        ) : null}

        {tab === 'delivery' ? (
        <Section title="Delivery" mark={{ ...stepMark('delivery'), number: steps.find((s) => s.id === 'delivery')?.number || 3 }}>
          <Grid>
            {showCommercial ? (
              <>
                <Field label="Payment terms">
                  <select value={header.paymentTerms} disabled={!canSave} onChange={(e) => updateHeader('paymentTerms', e.target.value)} className={inputClass}>
                    {PAYMENT_TERMS.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Payment method">
                  <select value={header.paymentMethod} disabled={!canSave} onChange={(e) => updateHeader('paymentMethod', e.target.value)} className={inputClass}>
                    {PAYMENT_METHODS.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Credit days">
                  <input type="number" min="0" value={header.creditDays} disabled={!canSave} onChange={(e) => updateHeader('creditDays', e.target.value)} className={inputClass} />
                </Field>
                <Field label="Advance amount">
                  <input type="number" min="0" step="any" value={header.advanceAmount} disabled={!canSave} onChange={(e) => updateHeader('advanceAmount', e.target.value)} className={inputClass} />
                </Field>
                <Field label="Remaining amount">
                  <input readOnly value={formatMoney(totals.remaining)} className={`${inputClass} font-semibold!`} />
                </Field>
                <Field label="Payment remarks">
                  <input value={header.paymentRemarks} disabled={!canSave} onChange={(e) => updateHeader('paymentRemarks', e.target.value)} className={inputClass} />
                </Field>
              </>
            ) : null}
          </Grid>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Billing address">
              <textarea rows={3} value={header.billingAddress} disabled={!canSave} onChange={(e) => updateHeader('billingAddress', e.target.value)} className={inputClass} />
            </Field>
            <Field label="Shipping address">
              <textarea rows={3} value={header.shippingAddress} disabled={!canSave} onChange={(e) => updateHeader('shippingAddress', e.target.value)} className={inputClass} />
            </Field>
            <Field label="Delivery location">
              <textarea rows={3} value={header.deliveryLocation} disabled={!canSave} onChange={(e) => updateHeader('deliveryLocation', e.target.value)} className={inputClass} />
            </Field>
            <Field label="Delivery instructions">
              <textarea rows={3} value={header.deliveryInstructions} disabled={!canSave} onChange={(e) => updateHeader('deliveryInstructions', e.target.value)} className={inputClass} />
            </Field>
            <Field label="Remarks">
              <textarea rows={3} value={header.remarks} disabled={!canSave} onChange={(e) => updateHeader('remarks', e.target.value)} className={inputClass} />
            </Field>
            <Field label="Production instructions">
              <textarea rows={3} value={header.productionInstructions} disabled={!canSave} onChange={(e) => updateHeader('productionInstructions', e.target.value)} className={inputClass} />
            </Field>
          </div>
        </Section>
        ) : null}

        {tab === 'totals' && showCommercial ? (
          <Section title="Total" mark={{ ...stepMark('totals'), number: steps.find((s) => s.id === 'totals')?.number || 4 }}>
            <Grid cols="sm:grid-cols-2 lg:grid-cols-5">
              <Field label="Subtotal">
                <input readOnly value={formatMoney(totals.subtotal)} className={inputClass} />
              </Field>
              <Field label="Order discount">
                <input type="number" min="0" step="any" value={header.discount} disabled={!canSave} onChange={(e) => updateHeader('discount', e.target.value)} className={inputClass} />
              </Field>
              <Field label="Tax">
                <input readOnly value={formatMoney(totals.tax)} className={inputClass} />
              </Field>
              <Field label="Grand total">
                <input readOnly value={formatMoney(totals.grandTotal)} className={`${inputClass} font-semibold!`} />
              </Field>
              <Field label="Remaining">
                <input readOnly value={formatMoney(totals.remaining)} className={`${inputClass} font-semibold!`} />
              </Field>
            </Grid>
          </Section>
        ) : null}

        {error ? <p className="text-sm text-red-700">{error}</p> : null}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <button
            type="button"
            disabled={isFirstStep}
            onClick={() => goStep(-1)}
            className="inline-flex items-center rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-ink hover:bg-paper disabled:cursor-not-allowed disabled:opacity-40"
          >
            ← Previous
          </button>
          <div className="flex flex-wrap items-center gap-2">
            {!isLastStep ? (
              <button
                type="button"
                onClick={() => goStep(1)}
                className="rounded-lg border border-accent px-4 py-2 text-sm font-semibold text-accent hover:bg-accent/10"
              >
                Next: Step {stepIndex + 2} · {steps[stepIndex + 1]?.label} →
              </button>
            ) : null}
            {canSave ? (
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-dark disabled:opacity-60"
              >
                {saving ? 'Saving…' : isEdit ? 'Save draft' : 'Create draft'}
              </button>
            ) : null}
          </div>
        </div>
        <p className="text-sm font-normal text-slate">Attachments can be added after the draft is saved.</p>
    </form>
  );
}
