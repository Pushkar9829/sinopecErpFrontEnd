import { inputClass } from '../components/ui/FormField';
import { emptyLine } from '../lib/intakeProposal';

const CUSTOMER_FIELDS = [
  ['name', 'Name'],
  ['companyName', 'Company'],
  ['mobile', 'Mobile'],
  ['email', 'Email'],
  ['gstNumber', 'GST'],
];

const LINE_FIELDS = [
  ['product', 'Product', 'min-w-40'],
  ['quantity', 'Qty', 'w-24'],
  ['unit', 'Unit', 'w-20'],
  ['width', 'Width', 'w-20'],
  ['length', 'Length', 'w-20'],
  ['material', 'Material', 'w-28'],
  ['rate', 'Rate', 'w-24'],
  ['notes', 'Notes', 'min-w-32'],
];

const small = `${inputClass} mt-0 px-2 py-1.5 text-sm`;

export function DraftOrderProposalEditor({ value, onChange, disabled = false }) {
  function setCustomer(key, next) {
    onChange({ ...value, customer: { ...value.customer, [key]: next } });
  }

  function setLine(index, key, next) {
    onChange({
      ...value,
      lines: value.lines.map((line, at) => (at === index ? { ...line, [key]: next } : line)),
    });
  }

  function addLine() {
    onChange({ ...value, lines: [...value.lines, emptyLine()] });
  }

  function removeLine(index) {
    const lines = value.lines.filter((_line, at) => at !== index);
    onChange({ ...value, lines: lines.length ? lines : [emptyLine()] });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {CUSTOMER_FIELDS.map(([key, label]) => (
          <label key={key} className="block text-sm font-semibold text-ink">
            {label}
            <input className={inputClass} value={value.customer[key] || ''} disabled={disabled} onChange={(event) => setCustomer(key, event.target.value)} />
          </label>
        ))}
        <label className="block text-sm font-semibold text-ink">
          Delivery
          <input className={inputClass} value={value.deliveryDate || ''} disabled={disabled} onChange={(event) => onChange({ ...value, deliveryDate: event.target.value })} placeholder="10 Oct 2026 or Friday" />
        </label>
        <label className="block text-sm font-semibold text-ink">
          Customer PO no.
          <input className={inputClass} value={value.poNumber || ''} disabled={disabled} onChange={(event) => onChange({ ...value, poNumber: event.target.value })} />
        </label>
        <label className="block text-sm font-semibold text-ink">
          PO date
          <input type="date" className={inputClass} value={/^\d{4}-\d{2}-\d{2}$/.test(value.poDate || '') ? value.poDate : ''} disabled={disabled} onChange={(event) => onChange({ ...value, poDate: event.target.value })} />
        </label>
        <label className="block text-sm font-semibold text-ink sm:col-span-2">
          Billing address
          <input className={inputClass} value={value.customer.billingAddress || ''} disabled={disabled} onChange={(event) => setCustomer('billingAddress', event.target.value)} />
        </label>
        <label className="block text-sm font-semibold text-ink sm:col-span-2">
          Shipping address
          <input className={inputClass} value={value.customer.shippingAddress || ''} disabled={disabled} onChange={(event) => setCustomer('shippingAddress', event.target.value)} />
        </label>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink">Lines</h3>
          {!disabled ? (
            <button type="button" onClick={addLine} className="text-sm font-semibold text-accent">
              Add line
            </button>
          ) : null}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-slate">
              <tr>
                {LINE_FIELDS.map(([key, label]) => (
                  <th key={key} className="py-1 pr-2 font-medium">
                    {label}
                  </th>
                ))}
                <th className="py-1" />
              </tr>
            </thead>
            <tbody>
              {value.lines.map((line, index) => (
                <tr key={index} className="border-t border-line align-top">
                  {LINE_FIELDS.map(([key, label, width]) => (
                    <td key={key} className={`py-1.5 pr-2 ${width}`}>
                      <input
                        aria-label={`${label} ${index + 1}`}
                        className={small}
                        value={line[key] ?? ''}
                        disabled={disabled}
                        inputMode={key === 'quantity' || key === 'rate' ? 'decimal' : undefined}
                        onChange={(event) => setLine(index, key, event.target.value)}
                      />
                    </td>
                  ))}
                  <td className="py-1.5">
                    {!disabled ? (
                      <button type="button" onClick={() => removeLine(index)} className="px-1 text-sm font-semibold text-rose-700" aria-label={`Remove line ${index + 1}`}>
                        Remove
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <label className="block text-sm font-semibold text-ink">
        Notes
        <textarea className={`${inputClass} min-h-20`} value={value.notes || ''} disabled={disabled} onChange={(event) => onChange({ ...value, notes: event.target.value })} />
      </label>
    </div>
  );
}
