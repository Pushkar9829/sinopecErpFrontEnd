import { useEffect, useMemo, useState } from 'react';
import { salesOrdersApi } from '../../api/salesOrders.api';
import { tasksApi } from '../../api/tasks.api';
import { useAuth } from '../../context/auth';
import { ORDER_TYPES, statusLabel } from '../../lib/sales';
import { notifyTasksChanged } from '../../lib/tasks';
import { Field, inputClass } from '../ui/FormField';
import { Modal } from '../ui/Modal';
import { AssigneeSelect } from './AssigneeSelect';
import { assigneePayload } from '../../lib/assignee';
import { formatQty, itemQuantityError } from '../../lib/itemQuantity';

const EMPTY = {
  title: '',
  description: '',
  assignee: '',
  dueDate: '',
  priority: 'normal',
  orderType: '',
  orderId: '',
  itemId: '',
  quantity: '',
};
export function ItemQuantityFields({ items = [], itemId, quantity, onChange, disabled = false }) {
  const item = items.find((entry) => entry.id === itemId);
  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
      <Field label="Item">
        <select
          value={itemId}
          disabled={disabled || !items.length}
          onChange={(event) => onChange({ itemId: event.target.value, quantity: event.target.value ? quantity : '' })}
          className={`${inputClass} disabled:bg-paper disabled:text-slate`}
        >
          <option value="">{items.length ? 'Whole order' : disabled ? 'Choose the order first' : 'No items on this order'}</option>
          {items.map((entry, index) => (
            <option key={entry.id} value={entry.id}>
              #{index + 1} {entry.product || entry.productCode || 'Item'}
              {entry.size ? ` (${entry.size})` : ''} · {formatQty(entry.quantity)} {entry.unit}
            </option>
          ))}
        </select>
      </Field>
      <Field label={item ? `Quantity (${item.unit || 'pcs'})` : 'Quantity'}>
        <input
          type="number"
          min="0"
          step="any"
          inputMode="decimal"
          value={quantity}
          disabled={!itemId}
          placeholder={item ? `Up to ${formatQty(item.quantity)}` : 'Choose an item'}
          onChange={(event) => onChange({ itemId, quantity: event.target.value })}
          className={`${inputClass} disabled:bg-paper disabled:text-slate`}
        />
      </Field>
    </div>
  );
}

// Mounted fresh each time it opens, so the form always starts empty.
export function TaskForm(props) {
  return props.open ? <TaskFormBody {...props} /> : null;
}

function TaskFormBody({ open, onClose, onCreated, orderId = '', orderNumber = '', orderItems = [] }) {
  const { user } = useAuth();
  const [form, setForm] = useState(() => ({ ...EMPTY, assignee: user?.id ? `user:${user.id}` : '' }));
  const [people, setPeople] = useState([]);
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    tasksApi
      .assignees()
      .then((list) => alive && setPeople(list))
      .catch(() => alive && setPeople([]));
    if (!orderId) {
      // Open orders only, as light list rows (no items): the chosen order's
      // items are fetched when it is picked.
      salesOrdersApi
        .page({ page: 1, pageSize: 100, status: 'open' })
        .then((data) => alive && setOrders(data.items || []))
        .catch(() => alive && setOrders([]));
    }
    return () => {
      alive = false;
    };
  }, [orderId]);

  const [pickedOrder, setPickedOrder] = useState({ id: '', items: [] });
  useEffect(() => {
    if (orderId || !form.orderId) return undefined;
    let alive = true;
    salesOrdersApi
      .get(form.orderId)
      .then((order) => alive && setPickedOrder({ id: form.orderId, items: order.items || [] }))
      .catch(() => alive && setPickedOrder({ id: form.orderId, items: [] }));
    return () => {
      alive = false;
    };
  }, [orderId, form.orderId]);

  const orderChoices = useMemo(
    () => orders.filter((order) => (order.orderType || 'sales_order') === form.orderType),
    [orders, form.orderType]
  );
  const items = orderId ? orderItems : pickedOrder.id === form.orderId ? pickedOrder.items : [];

  function set(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    if (!form.title.trim()) {
      setError('Enter a title');
      return;
    }
    if (!orderId && form.orderType && !form.orderId) {
      setError(`Choose the ${form.orderType === 'job_work' ? 'job work' : 'sales order'} or set Link to "No order"`);
      return;
    }
    const qtyError = itemQuantityError(items, form.itemId, form.quantity);
    if (qtyError) {
      setError(qtyError);
      return;
    }
    setSaving(true);
    setError('');
    try {
      const created = await tasksApi.create({
        title: form.title,
        description: form.description,
        priority: form.priority,
        dueDate: form.dueDate || undefined,
        orderId: orderId || form.orderId || undefined,
        itemId: form.itemId || undefined,
        quantity: form.itemId && form.quantity !== '' ? Number(form.quantity) : undefined,
        ...assigneePayload(form.assignee),
      });
      notifyTasksChanged();
      onCreated?.(created);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} title={orderNumber ? `New task for ${orderNumber}` : 'New task'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Title">
          <input value={form.title} onChange={(event) => set('title', event.target.value)} className={inputClass} autoFocus />
        </Field>
        {!orderId ? (
          <div className="grid gap-3 sm:grid-cols-[12rem_1fr]">
            <Field label="Link to">
              <select
                value={form.orderType}
                onChange={(event) =>
                  setForm((current) => ({ ...current, orderType: event.target.value, orderId: '', itemId: '', quantity: '' }))
                }
                className={inputClass}
              >
                <option value="">No order</option>
                {ORDER_TYPES.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={form.orderType === 'job_work' ? 'Job work' : 'Sales order'}>
              <select
                value={form.orderId}
                onChange={(event) => setForm((current) => ({ ...current, orderId: event.target.value, itemId: '', quantity: '' }))}
                disabled={!form.orderType}
                className={`${inputClass} disabled:bg-paper disabled:text-slate`}
              >
                <option value="">
                  {!form.orderType ? 'Choose Link to first' : orderChoices.length ? 'Choose an order' : 'No open orders'}
                </option>
                {orderChoices.map((order) => (
                  <option key={order.id} value={order.id}>
                    {order.number}
                    {order.customer?.name ? ` · ${order.customer.name}` : ''} · {statusLabel(order.status)}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        ) : null}
        {orderId || form.orderType ? (
          <ItemQuantityFields
            items={items}
            itemId={form.itemId}
            quantity={form.quantity}
            disabled={!orderId && !form.orderId}
            onChange={(next) => setForm((current) => ({ ...current, ...next }))}
          />
        ) : null}
        <Field label="Details">
          <textarea value={form.description} onChange={(event) => set('description', event.target.value)} rows={3} className={inputClass} />
        </Field>
        <Field label="Assign to">
          <AssigneeSelect value={form.assignee} onChange={(value) => set('assignee', value)} people={people} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Due date">
            <input type="date" value={form.dueDate} onChange={(event) => set('dueDate', event.target.value)} className={inputClass} />
          </Field>
          <Field label="Priority">
            <select value={form.priority} onChange={(event) => set('priority', event.target.value)} className={inputClass}>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </Field>
        </div>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-ink hover:bg-paper">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-dark disabled:opacity-60">
            {saving ? 'Saving…' : 'Create task'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
