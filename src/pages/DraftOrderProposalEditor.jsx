import { inputClass } from '../components/ui/FormField';
import { emptyLine } from '../lib/intakeProposal';

const CUSTOMER_FIELDS = [
  ['name', 'Name'],
  ['companyName', 'Company'],
  ['mobile', 'Mobile'],
  ['email', 'Email'],
  ['gstNumber', 'GST'],
];

const SIZE_UNITS = ['inch', 'mm', 'cm'];
const THICKNESS_KINDS = ['gauge', 'micron'];
const UNITS = ['pcs', 'kg', 'box', 'roll', 'mtr'];
const MATERIALS = ['LDPE', 'LDPE, recycled', 'HDPE', 'LLDPE', 'PP', 'BOPP'];

const field = `${inputClass} mt-1 px-2.5 py-2 text-sm`;
const label = 'block text-xs font-semibold uppercase tracking-wide text-slate';

// One-line summary of a line: "9.5 × 13 + 2 inch · 51 micron · LDPE".
function lineSummary(line) {
  const unit = line.sizeUnit || (line.width || line.length ? 'inch' : '');
  const size = line.width || line.length ? `${line.width || '?'} × ${line.length || '?'}${line.flap ? ` + ${line.flap}` : ''} ${unit}`.trim() : '';
  const gusset = line.gusset ? `gusset ${line.gusset}` : '';
  const thickness = line.thickness ? `${line.thickness} ${line.thicknessKind || ''}`.trim() : '';
  const qty = line.quantity !== '' && line.quantity !== null && line.quantity !== undefined ? `${line.quantity} ${line.unit || ''}`.trim() : '';
  return [qty, size, gusset, thickness, line.material].filter(Boolean).join(' · ');
}

// A small two- or three-way switch (inch / mm / cm, gauge / micron).
function Toggle({ options, value, onChange, disabled, name }) {
  return (
    <div role="radiogroup" aria-label={name} className="mt-1 inline-flex overflow-hidden rounded-lg border border-line">
      {options.map((option) => {
        const on = value === option;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={disabled}
            onClick={() => onChange(on ? '' : option)}
            className={`px-3 py-2 text-sm font-semibold ${on ? 'bg-accent text-white' : 'bg-white text-slate hover:bg-paper'} disabled:opacity-60`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

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

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-ink">Products</h3>
        <datalist id="intake-units">
          {UNITS.map((unit) => (
            <option key={unit} value={unit} />
          ))}
        </datalist>
        <datalist id="intake-materials">
          {MATERIALS.map((material) => (
            <option key={material} value={material} />
          ))}
        </datalist>

        {value.lines.map((line, index) => {
          const input = (key, extra = {}) => ({
            value: line[key] ?? '',
            disabled,
            onChange: (event) => setLine(index, key, event.target.value),
            ...extra,
          });
          const summary = lineSummary(line);
          return (
            <section key={index} className="rounded-xl border border-line bg-white p-4 shadow-sm">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">Product {index + 1}</p>
                  {summary ? <p className="text-xs text-slate">{summary}</p> : null}
                </div>
                {!disabled && value.lines.length > 1 ? (
                  <button type="button" onClick={() => removeLine(index)} className="rounded-lg px-2 py-1 text-sm font-semibold text-rose-700 hover:bg-rose-50" aria-label={`Remove product ${index + 1}`}>
                    Remove
                  </button>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
                <label className={label}>
                  Product
                  <input className={field} {...input('product')} placeholder="e.g. LD polybag" />
                  {line.sizeText ? <span className="mt-1 block text-xs font-normal normal-case tracking-normal text-slate">Size as written: {line.sizeText}</span> : null}
                </label>
                <label className={label}>
                  Quantity
                  <input className={field} {...input('quantity', { inputMode: 'decimal' })} />
                </label>
                <label className={label}>
                  Unit
                  <input className={field} {...input('unit', { list: 'intake-units' })} placeholder="pcs" />
                </label>
              </div>

              <div className="mt-3 rounded-lg bg-paper/60 p-3">
                <div className="flex flex-wrap items-end gap-x-2 gap-y-3">
                  <label className={`${label} w-24`}>
                    Width
                    <input className={field} {...input('width', { inputMode: 'decimal' })} />
                  </label>
                  <span className="pb-2.5 text-lg text-slate" aria-hidden="true">
                    ×
                  </span>
                  <label className={`${label} w-24`}>
                    Length
                    <input className={field} {...input('length', { inputMode: 'decimal' })} />
                  </label>
                  <span className="pb-2.5 text-lg text-slate" aria-hidden="true">
                    +
                  </span>
                  <label className={`${label} w-24`}>
                    Flap
                    <input className={field} {...input('flap', { inputMode: 'decimal' })} />
                  </label>
                  <label className={`${label} ml-2 w-24`}>
                    Gusset
                    <input className={field} {...input('gusset', { inputMode: 'decimal' })} />
                  </label>
                  <div className={`${label} ml-2`}>
                    Size in
                    <div>
                      <Toggle name={`Size unit ${index + 1}`} options={SIZE_UNITS} value={line.sizeUnit || ''} disabled={disabled} onChange={(next) => setLine(index, 'sizeUnit', next)} />
                    </div>
                  </div>
                </div>
                {line.flap ? (
                  <p className="mt-2 text-xs text-slate">
                    Weight uses length {line.length || '?'} + {line.flap} ÷ 2 = {Number(line.length) > 0 && Number(line.flap) > 0 ? Number(line.length) + Number(line.flap) / 2 : '?'}
                  </p>
                ) : null}
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)]">
                <div className="flex items-end gap-2">
                  <label className={`${label} w-24`}>
                    Thickness
                    <input className={field} {...input('thickness', { inputMode: 'decimal' })} />
                  </label>
                  <Toggle name={`Gauge or micron ${index + 1}`} options={THICKNESS_KINDS} value={line.thicknessKind || ''} disabled={disabled} onChange={(next) => setLine(index, 'thicknessKind', next)} />
                </div>
                <label className={label}>
                  Material
                  <input className={field} {...input('material', { list: 'intake-materials' })} placeholder="LDPE" />
                </label>
                <label className={label}>
                  Rate (₹)
                  <input className={field} {...input('rate', { inputMode: 'decimal' })} placeholder="per unit" />
                </label>
              </div>

              <label className={`${label} mt-3`}>
                Notes
                <input className={field} {...input('notes')} placeholder="Printed, self-adhesive 15 mm, 2 holes…" />
              </label>
            </section>
          );
        })}

        {!disabled ? (
          <button type="button" onClick={addLine} className="w-full rounded-xl border-2 border-dashed border-line py-3 text-sm font-semibold text-accent hover:border-accent hover:bg-paper/60">
            + Add product
          </button>
        ) : null}
      </div>

      <label className="block text-sm font-semibold text-ink">
        Notes
        <textarea className={`${inputClass} min-h-20`} value={value.notes || ''} disabled={disabled} onChange={(event) => onChange({ ...value, notes: event.target.value })} />
      </label>
    </div>
  );
}
