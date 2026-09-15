import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { customersApi } from '../api/customers.api';
import { salesOrdersApi } from '../api/salesOrders.api';
import { salesSettingsApi } from '../api/salesSettings.api';
import { SalesOrderLineCard } from '../components/sales/SalesOrderLineCard';
import { Field, Grid, Section, inputClass } from '../components/ui/FormField';
import { PageHeader } from '../components/ui/PageHeader';
import { Tabs } from '../components/ui/Tabs';
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

  if (!loaded) {
    return <p className="text-sm text-slate">Loading sales order…</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <PageHeader
        title={isEdit ? `Edit ${number}` : 'New sales order'}
        subtitle="Save as draft. Submit from the order page when product, manufacturing, and delivery details are complete."
        backTo={isEdit ? `/sales-orders/${id}` : '/sales-orders'}
        backLabel={isEdit ? number : 'Sales orders'}
        actions={
          canSave ? (
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-accent px-4 py-1.5 text-sm font-medium text-white hover:bg-accent-dark disabled:opacity-60"
            >
              {saving ? 'Saving…' : isEdit ? 'Save draft' : 'Create draft'}
            </button>
          ) : null
        }
        extra={
          <Tabs
            tabs={[
              { id: 'order', label: 'Order', tone: 'info' },
              { id: 'delivery', label: 'Delivery & payment', tone: 'warning' },
              { id: 'products', label: 'Products', count: items.length, tone: 'accent' },
              ...(showCommercial ? [{ id: 'totals', label: 'Totals', tone: 'success' }] : []),
            ]}
            value={tab}
            onChange={setTab}
          />
        }
      />

        {tab === 'order' ? (
        <>
        <Section title="Order">
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

        {tab === 'delivery' ? (
        <Section title="Delivery and payment">
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
                  <input readOnly value={formatMoney(totals.remaining)} className={inputClass} />
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

        {tab === 'products' ? (
        <Section
          title="Line items"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <select
                value=""
                disabled={!canSave}
                onChange={(event) => {
                  const route = event.target.value;
                  if (!route) return;
                  setItems((prev) => prev.map((item) => applyRoute(item, route)));
                }}
                className={`${inputClass} mt-0 w-64`}
              >
                <option value="">Set flow on all products</option>
                {PRODUCTION_ROUTES.map((route) => (
                  <option key={route.id} value={route.id}>
                    {route.label}
                  </option>
                ))}
              </select>
              {canSave ? (
                <button
                  type="button"
                  onClick={() => setItems((prev) => [...prev, emptyLineItem()])}
                  className="rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-paper"
                >
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
                onChange={(next) => setItems((prev) => prev.map((row, rowIndex) => (rowIndex === index ? next : row)))}
                onRemove={() => setItems((prev) => prev.filter((_, rowIndex) => rowIndex !== index))}
              />
            ))}
          </div>
        </Section>
        ) : null}

        {tab === 'totals' && showCommercial ? (
          <Section title="Totals">
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
                <input readOnly value={formatMoney(totals.grandTotal)} className={inputClass} />
              </Field>
              <Field label="Remaining">
                <input readOnly value={formatMoney(totals.remaining)} className={inputClass} />
              </Field>
            </Grid>
          </Section>
        ) : null}

        {error ? <p className="text-sm text-red-700">{error}</p> : null}

        {canSave ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-dark disabled:opacity-60"
            >
              {saving ? 'Saving…' : isEdit ? 'Save draft' : 'Create draft'}
            </button>
            <p className="self-center text-xs text-slate">Attachments can be added after the draft is saved.</p>
          </div>
        ) : null}
    </form>
  );
}
