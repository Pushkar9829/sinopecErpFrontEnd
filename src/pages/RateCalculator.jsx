import { useState } from 'react';
import { JOB_WORK_EXAMPLE, SALES_ORDER_EXAMPLE, jobWork, num, salesOrder } from '../lib/rateCalculator';

const TABS = [
  { id: 'job', label: 'Job work' },
  { id: 'sales', label: 'Sales order' },
];

const PRINT_CHART = [
  { colours: '1+0', small: 60, large: 100, minimum: 225 },
  { colours: '1+1', small: 120, large: '', minimum: 375 },
  { colours: '1+2', small: 160, large: 250, minimum: '' },
  { colours: '2+2', small: 400, large: 400, minimum: '' },
  { colours: '2+3', small: 500, large: 500, minimum: '' },
  { colours: '3+3', small: 600, large: 600, minimum: '' },
];

function rs(value) {
  return Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function plain(value) {
  return num(value).toLocaleString('en-IN', { maximumFractionDigits: 4 });
}

function blank(example) {
  return Object.fromEntries(Object.entries(example).map(([key, value]) => [key, typeof value === 'boolean' ? value : '']));
}

function Field({ label, value, onChange, suffix, placeholder, disabled }) {
  return (
    <label className="block text-sm font-semibold text-ink">
      {label}
      <div className={`mt-1 flex items-center rounded-lg border border-line focus-within:border-accent ${disabled ? 'bg-paper' : 'bg-white'}`}>
        <input
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full min-w-0 bg-transparent px-3 py-2 text-base font-normal outline-none disabled:text-steel"
        />
        {suffix ? <span className="shrink-0 pr-3 text-xs font-normal text-steel">{suffix}</span> : null}
      </div>
    </label>
  );
}

function Stage({ number, title, on, onToggle, result, working, children }) {
  return (
    <section className={`flex flex-col rounded-xl border bg-card ${on === false ? 'border-line opacity-70' : 'border-line'}`}>
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
        <h2 className="flex items-center gap-2 font-semibold text-ink">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/10 text-xs text-accent">{number}</span>
          {title}
        </h2>
        {onToggle ? (
          <label className="flex items-center gap-2 text-sm text-slate">
            <input type="checkbox" checked={on} onChange={(event) => onToggle(event.target.checked)} className="h-4 w-4 accent-accent" />
            Include
          </label>
        ) : null}
      </div>
      <div className="flex-1 space-y-3 px-4 py-3">{children}</div>
      <div className="rounded-b-xl border-t border-line bg-paper px-4 py-3">
        <p className="text-2xl font-semibold tabular-nums text-ink">₹ {rs(result)}</p>
        <p className="mt-0.5 text-xs text-slate">{working}</p>
      </div>
    </section>
  );
}

function Toolbar({ onExample, onClear }) {
  return (
    <div className="flex gap-2">
      <button type="button" onClick={onExample} className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-semibold text-ink hover:bg-paper">
        Sheet example
      </button>
      <button type="button" onClick={onClear} className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-semibold text-ink hover:bg-paper">
        Clear
      </button>
    </div>
  );
}

function JobWorkCalculator() {
  const [input, setInput] = useState(JOB_WORK_EXAMPLE);
  const set = (key) => (value) => setInput((current) => ({ ...current, [key]: value }));
  const r = jobWork(input);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate">Customer gives the material. Enter each stage done on the job.</p>
        <Toolbar onExample={() => setInput(JOB_WORK_EXAMPLE)} onClear={() => setInput(blank(JOB_WORK_EXAMPLE))} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Stage
          number={1}
          title="Printing"
          on={input.printOn}
          onToggle={set('printOn')}
          result={r.printing}
          working={
            input.printOn
              ? `${plain(input.pcs)} × ${plain(input.printRate)} ÷ 1000 = ${rs(r.printBase)}${r.printMinimumUsed ? ` → minimum ₹${plain(input.printMinimum)} charged` : ''}`
              : 'Not included'
          }
        >
          <Field label="Pieces" value={input.pcs} onChange={set('pcs')} suffix="pcs" disabled={!input.printOn} />
          <Field label="Rate" value={input.printRate} onChange={set('printRate')} suffix="₹ / 1000 pcs" disabled={!input.printOn} />
          <Field label="Minimum charge" value={input.printMinimum} onChange={set('printMinimum')} suffix="₹ / job" placeholder="0" disabled={!input.printOn} />
        </Stage>

        <Stage
          number={2}
          title="Cutting"
          on={input.cutOn}
          onToggle={set('cutOn')}
          result={r.cutting}
          working={
            input.cutOn
              ? `${plain(input.kg)} kg × ${plain(input.cutRate)} = ${rs(r.cutBase)}${r.cutMinimumUsed ? ` → minimum ₹${plain(input.cutMinimum)} charged` : ''}`
              : 'Not included'
          }
        >
          <Field label="Weight" value={input.kg} onChange={set('kg')} suffix="kg" disabled={!input.cutOn} />
          <Field label="Rate" value={input.cutRate} onChange={set('cutRate')} suffix="₹ / kg" disabled={!input.cutOn} />
          <Field label="Minimum charge" value={input.cutMinimum} onChange={set('cutMinimum')} suffix="₹ / job" placeholder="0" disabled={!input.cutOn} />
        </Stage>

        <Stage
          number={3}
          title="Hole"
          on={input.holeOn}
          onToggle={set('holeOn')}
          result={r.hole}
          working={input.holeOn ? `${plain(r.holePcs)} × ${plain(input.holeRate)} ÷ 1000 = ${rs(r.hole)}` : 'Not included'}
        >
          <Field label="Pieces" value={input.holePcs} onChange={set('holePcs')} suffix="pcs" placeholder={input.pcs ? `same as printing (${plain(input.pcs)})` : ''} disabled={!input.holeOn} />
          <Field label="Rate" value={input.holeRate} onChange={set('holeRate')} suffix="₹ / 1000 pcs" disabled={!input.holeOn} />
        </Stage>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-accent/40 bg-accent/5 px-5 py-4">
        <div className="text-sm text-slate">
          Printing ₹{rs(r.printing)} + Cutting ₹{rs(r.cutting)} + Hole ₹{rs(r.hole)}
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate">Job work total</p>
          <p className="text-3xl font-semibold tabular-nums text-accent">₹ {rs(r.total)}</p>
        </div>
      </div>

      <details className="rounded-xl border border-line bg-card px-4 py-3 text-sm">
        <summary className="cursor-pointer font-semibold text-ink">Printing chart from the sheet (₹ per 1000 pcs)</summary>
        <table className="mt-3 w-full max-w-lg text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-slate">
            <tr>
              <th className="py-1">Colours</th>
              <th className="py-1 text-right">3 to 19 in</th>
              <th className="py-1 text-right">24 in & above</th>
              <th className="py-1 text-right">Minimum</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {PRINT_CHART.map((row) => (
              <tr key={row.colours}>
                <td className="py-1 font-medium">{row.colours}</td>
                <td className="py-1 text-right tabular-nums">{row.small || '—'}</td>
                <td className="py-1 text-right tabular-nums">{row.large || '—'}</td>
                <td className="py-1 text-right tabular-nums">{row.minimum || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

function ResultRow({ label, value, strong, muted }) {
  return (
    <div className={`flex items-center justify-between py-1.5 ${strong ? 'font-semibold text-ink' : muted ? 'text-steel' : 'text-ink'}`}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

function SalesOrderCalculator() {
  const [input, setInput] = useState(SALES_ORDER_EXAMPLE);
  const set = (key) => (value) => setInput((current) => ({ ...current, [key]: value }));
  const r = salesOrder(input);
  const kg = r.weight.toFixed(4);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate">Our material goes through every stage. All costs are per 1000 pcs.</p>
        <Toolbar onExample={() => setInput(SALES_ORDER_EXAMPLE)} onClear={() => setInput(blank(SALES_ORDER_EXAMPLE))} />
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Stage number={1} title="Material (rolling)" result={r.material} working={`Weight ${plain(input.width)} × ${plain(input.length)} × ${plain(input.gauge)} ÷ ${plain(input.divisor)} = ${kg} kg · ${kg} × ${plain(input.materialRate)} = ${rs(r.material)}`}>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                <Field label="Width" value={input.width} onChange={set('width')} suffix="in" />
                <Field label="Length" value={input.length} onChange={set('length')} suffix="in" />
                <Field label="Gauge" value={input.gauge} onChange={set('gauge')} />
                <Field label="Divisor" value={input.divisor} onChange={set('divisor')} />
                <Field label="Material rate" value={input.materialRate} onChange={set('materialRate')} suffix="₹/kg" />
              </div>
            </Stage>
          </div>

          <Stage number={2} title="Printing" on={input.printOn} onToggle={set('printOn')} result={r.printing} working={input.printOn ? 'Flat amount per 1000 pcs' : 'Not included'}>
            <Field label="Rate" value={input.printRate} onChange={set('printRate')} suffix="₹ / 1000 pcs" disabled={!input.printOn} />
          </Stage>

          <Stage number={3} title="Cutting" on={input.cutOn} onToggle={set('cutOn')} result={r.cutting} working={input.cutOn ? `${kg} kg × ${plain(input.cutRate)} = ${rs(r.cutting)}` : 'Not included'}>
            <Field label="Rate" value={input.cutRate} onChange={set('cutRate')} suffix="₹ / kg" disabled={!input.cutOn} />
          </Stage>

          <Stage number={4} title="Hole" on={input.holeOn} onToggle={set('holeOn')} result={r.hole} working={input.holeOn ? 'Flat amount per 1000 pcs' : 'Not included'}>
            <Field label="Rate" value={input.holeRate} onChange={set('holeRate')} suffix="₹ / 1000 pcs" disabled={!input.holeOn} />
          </Stage>

          <Stage number={5} title="Tape" on={input.tapeOn} onToggle={set('tapeOn')} result={r.tape} working={input.tapeOn ? `${plain(input.width)} in × ${plain(input.tapeRate)} = ${rs(r.tape)}` : 'Not included'}>
            <Field label="Rate" value={input.tapeRate} onChange={set('tapeRate')} suffix="₹ / inch" disabled={!input.tapeOn} />
          </Stage>

          <div className="md:col-span-2">
            <Stage number={6} title="Margin and quantity" result={r.marginAmount} working={`Cost ${rs(r.cost)} × ${plain(input.margin)}% = ${rs(r.marginAmount)} margin`}>
              <div className="grid grid-cols-2 gap-3 sm:max-w-md">
                <Field label="Margin" value={input.margin} onChange={set('margin')} suffix="%" />
                <Field label="Order quantity" value={input.quantity} onChange={set('quantity')} suffix="pcs" placeholder="optional" />
              </div>
            </Stage>
          </div>
        </div>

        <aside className="rounded-xl border-2 border-accent/40 bg-card p-4 lg:sticky lg:top-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate">Quotation per 1000 pcs</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums text-accent">₹ {rs(r.quote)}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-paper px-3 py-2">
              <p className="text-[11px] text-steel">Per piece</p>
              <p className="font-semibold tabular-nums">₹ {r.perPiece.toFixed(4)}</p>
            </div>
            <div className="rounded-lg bg-paper px-3 py-2">
              <p className="text-[11px] text-steel">Per kg</p>
              <p className="font-semibold tabular-nums">₹ {rs(r.perKg)}</p>
            </div>
          </div>
          <div className="mt-4 divide-y divide-line text-sm">
            <ResultRow label={`Weight`} value={`${kg} kg`} muted />
            <ResultRow label="1. Material" value={rs(r.material)} />
            <ResultRow label="2. Printing" value={rs(r.printing)} />
            <ResultRow label="3. Cutting" value={rs(r.cutting)} />
            <ResultRow label="4. Hole" value={rs(r.hole)} />
            <ResultRow label="5. Tape" value={rs(r.tape)} />
            <ResultRow label="Cost" value={rs(r.cost)} strong />
            <ResultRow label={`6. Margin ${plain(input.margin)}%`} value={`+ ${rs(r.marginAmount)}`} muted />
            <ResultRow label="Quotation" value={rs(r.quote)} strong />
          </div>
          {r.orderValue ? (
            <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
              <p className="text-[11px] text-emerald-800">Order value · {r.quantity.toLocaleString('en-IN')} pcs</p>
              <p className="text-lg font-semibold tabular-nums text-emerald-900">₹ {rs(r.orderValue)}</p>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

export function RateCalculator() {
  const [tab, setTab] = useState('job');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-card px-4 py-3">
        <h1 className="text-lg font-semibold text-ink">Rate calculator</h1>
        <div className="flex gap-1 rounded-lg bg-paper p-1">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`rounded-md px-4 py-1.5 text-sm font-semibold ${tab === item.id ? 'bg-white text-accent shadow-sm' : 'text-slate hover:text-ink'}`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <span className="ml-auto rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">Trial · not linked to orders</span>
      </div>

      {tab === 'job' ? <JobWorkCalculator /> : <SalesOrderCalculator />}
    </div>
  );
}
