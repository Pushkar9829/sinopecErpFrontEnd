import { useEffect, useState } from 'react';
import { rateCalculatorApi } from '../api/rateCalculator.api';
import { useCalculation } from '../hooks/useCalculation';

function rs(value) {
  return Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function Switch({ on, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${on ? 'bg-accent' : 'bg-line'}`}
    >
      <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition ${on ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  );
}

function Field({ label, value, onChange, unit, placeholder }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate">{label}</span>
      <div className="mt-1.5 flex items-center rounded-xl border border-line bg-white transition focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/10">
        <input
          inputMode="decimal"
          value={value ?? ''}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="w-full min-w-0 bg-transparent px-3.5 py-2.5 text-lg font-medium tabular-nums text-ink outline-none placeholder:text-sm placeholder:font-normal placeholder:text-steel"
        />
        {unit ? <span className="shrink-0 pr-3.5 text-xs text-steel">{unit}</span> : null}
      </div>
    </label>
  );
}

function StageCard({ number, title, on, onToggle, amount, action, children }) {
  return (
    <section className={`rounded-2xl border bg-card transition ${on ? 'border-line shadow-sm' : 'border-dashed border-line'}`}>
      <div className="flex items-center gap-3 px-5 py-4">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-semibold ${on ? 'bg-accent text-white' : 'bg-paper text-steel'}`}>{number}</span>
        <h3 className={`flex-1 font-semibold ${on ? 'text-ink' : 'text-steel'}`}>{title}</h3>
        {on && amount !== undefined ? <span className="text-lg font-semibold tabular-nums text-ink">₹ {rs(amount)}</span> : null}
        <Switch on={on} onChange={onToggle} label={`Include ${title}`} />
      </div>
      {on ? (
        <div className="space-y-3 border-t border-line px-5 py-4">
          <div className="grid gap-3 sm:grid-cols-3">{children}</div>
          {action}
        </div>
      ) : null}
    </section>
  );
}

function ChartPicker({ chart, onPick }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" onClick={() => setOpen((value) => !value)} className="text-sm font-semibold text-accent hover:text-accent-dark">
        {open ? 'Hide chart' : 'Printing chart'}
      </button>
      {open ? (
        <div className="mt-3 overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead className="bg-paper text-xs uppercase tracking-wide text-slate">
              <tr>
                <th className="px-3 py-2 text-left">Colours</th>
                {chart.bands.map((band) => (
                  <th key={band.id} className="px-3 py-2 text-right">
                    {band.label}
                  </th>
                ))}
                <th className="px-3 py-2 text-right">Minimum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-white">
              {chart.rows.map((row) => (
                <tr key={row.colours}>
                  <td className="px-3 py-1.5 font-semibold text-ink">{row.colours}</td>
                  {chart.bands.map((band) => (
                    <td key={band.id} className="px-1.5 py-1 text-right">
                      {row[band.id] ? (
                        <button
                          type="button"
                          onClick={() => {
                            onPick(row[band.id], row.minimum);
                            setOpen(false);
                          }}
                          className="rounded-lg px-2.5 py-1 font-medium tabular-nums text-ink hover:bg-accent hover:text-white"
                        >
                          {row[band.id]}
                        </button>
                      ) : (
                        <span className="px-2.5 text-steel">—</span>
                      )}
                    </td>
                  ))}
                  <td className="px-3 py-1.5 text-right tabular-nums text-slate">{row.minimum || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

function CalcError({ error, retry }) {
  if (!error) return null;
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
      <span>Could not calculate. {error}</span>
      <button type="button" onClick={retry} className="font-semibold underline">
        Retry
      </button>
    </div>
  );
}

function JobWorkBill({ calc }) {
  const { result, loading, error, retry } = calc;
  const included = result?.stages.filter((stage) => stage.included) || [];
  return (
    <aside aria-label="Job work bill" className="overflow-hidden rounded-2xl border border-line bg-card shadow-sm lg:sticky lg:top-4">
      <div className={`space-y-4 px-5 py-4 transition-opacity ${loading ? 'opacity-60' : ''}`}>
        <CalcError error={error} retry={retry} />
        <ul className="space-y-4">
          {included.map((stage) => (
            <li key={stage.key} data-stage={stage.key}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="flex items-center gap-2 font-medium text-ink">
                  {stage.label}
                  {stage.minimumApplied ? <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-800">Minimum</span> : null}
                </span>
                <span className="font-semibold tabular-nums text-ink">₹ {rs(stage.amount)}</span>
              </div>
              <p className="mt-0.5 text-xs text-slate">{stage.working}</p>
            </li>
          ))}
        </ul>
      </div>
      <div className="border-t border-dashed border-line bg-paper px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate">Total</p>
        <p data-testid="job-total" className={`text-3xl font-semibold tabular-nums text-accent transition-opacity ${loading ? 'opacity-60' : ''}`}>
          ₹ {rs(result?.total)}
        </p>
      </div>
    </aside>
  );
}

function JobWorkCalculator({ defaults }) {
  const [input, setInput] = useState(defaults.jobWork);
  const calc = useCalculation(rateCalculatorApi.jobWork, input);
  const set = (key) => (value) => setInput((current) => ({ ...current, [key]: value }));
  const stage = (key) => calc.result?.stages.find((item) => item.key === key);

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-4">
        <StageCard
          number={1}
          title="Printing"
          on={input.printOn}
          onToggle={set('printOn')}
          amount={stage('printing')?.amount}
          action={
            <ChartPicker
              chart={defaults.printChart}
              onPick={(rate, minimum) => setInput((current) => ({ ...current, printRate: String(rate), printMinimum: minimum ? String(minimum) : '' }))}
            />
          }
        >
          <Field label="Pieces" value={input.pcs} onChange={set('pcs')} unit="pcs" />
          <Field label="Rate" value={input.printRate} onChange={set('printRate')} unit="₹ / 1000" />
          <Field label="Minimum charge" value={input.printMinimum} onChange={set('printMinimum')} unit="₹" />
        </StageCard>

        <StageCard number={2} title="Cutting" on={input.cutOn} onToggle={set('cutOn')} amount={stage('cutting')?.amount}>
          <Field label="Weight" value={input.kg} onChange={set('kg')} unit="kg" />
          <Field label="Rate" value={input.cutRate} onChange={set('cutRate')} unit="₹ / kg" />
          <Field label="Minimum charge" value={input.cutMinimum} onChange={set('cutMinimum')} unit="₹" />
        </StageCard>

        <StageCard number={3} title="Hole" on={input.holeOn} onToggle={set('holeOn')} amount={stage('hole')?.amount}>
          <Field label="Pieces" value={input.holePcs} onChange={set('holePcs')} unit="pcs" placeholder={input.pcs || ''} />
          <Field label="Rate" value={input.holeRate} onChange={set('holeRate')} unit="₹ / 1000" />
        </StageCard>
      </div>

      <JobWorkBill calc={calc} />
    </div>
  );
}

function SalesOrderCalculator({ defaults }) {
  const [input, setInput] = useState(defaults.salesOrder);
  const { result, loading, error, retry } = useCalculation(rateCalculatorApi.salesOrder, input);
  const set = (key) => (value) => setInput((current) => ({ ...current, [key]: value }));

  return (
    <section className="grid overflow-hidden rounded-2xl border border-line bg-card shadow-sm lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-3 p-5">
        <h3 className="font-semibold text-ink">Material (rolling)</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Width" value={input.width} onChange={set('width')} unit="in" />
          <Field label="Length" value={input.length} onChange={set('length')} unit="in" />
          <Field label="Gauge" value={input.gauge} onChange={set('gauge')} />
          <Field label="Divisor" value={input.divisor} onChange={set('divisor')} />
          <Field label="Material rate" value={input.materialRate} onChange={set('materialRate')} unit="₹ / kg" />
        </div>
      </div>

      <aside aria-label="Material result" className="space-y-4 border-t border-line bg-paper p-5 lg:border-l lg:border-t-0">
        <CalcError error={error} retry={retry} />
        <div className={`space-y-4 transition-opacity ${loading ? 'opacity-60' : ''}`}>
          <div className="rounded-xl bg-white px-4 py-3">
            <p className="text-xs text-steel">Weight</p>
            <p data-testid="sales-weight" className="text-2xl font-semibold tabular-nums text-ink">{result ? `${result.weight.toFixed(4)} kg` : '—'}</p>
            <p className="mt-0.5 text-xs text-slate">{result?.weightWorking}</p>
          </div>
          <div className="rounded-xl bg-white px-4 py-3 ring-2 ring-accent/30">
            <p className="text-xs text-steel">Material cost</p>
            <p data-testid="sales-material" className="text-3xl font-semibold tabular-nums text-accent">₹ {rs(result?.material)}</p>
            <p className="mt-0.5 text-xs text-slate">{result?.materialWorking}</p>
          </div>
        </div>
      </aside>
    </section>
  );
}

const TABS = [
  { id: 'job', label: 'Job work' },
  { id: 'sales', label: 'Sales order' },
];

export function RateCalculator() {
  const [tab, setTab] = useState('job');
  const [defaults, setDefaults] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    rateCalculatorApi
      .defaults()
      .then((data) => {
        if (!alive) return;
        setDefaults(data);
        setLoadError('');
      })
      .catch((error) => alive && setLoadError(error.message || 'Could not load the calculator'));
    return () => {
      alive = false;
    };
  }, [attempt]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="text-xl font-semibold text-ink">Rate calculator</h1>
        <div role="tablist" aria-label="Calculator" className="inline-flex rounded-lg border border-line bg-white p-0.5">
          {TABS.map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(item.id)}
                className={`rounded-md px-3 py-1.5 text-sm font-semibold ${active ? 'bg-ink text-paper' : 'text-ink hover:bg-paper'}`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {loadError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-6 text-center text-rose-800">
          <p className="font-semibold">Could not load the calculator.</p>
          <p className="text-sm">{loadError}</p>
          <button type="button" onClick={() => setAttempt((value) => value + 1)} className="mt-3 rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-rose-800 shadow-sm">
            Retry
          </button>
        </div>
      ) : !defaults ? (
        <div className="space-y-4">
          {[0, 1, 2].map((key) => (
            <div key={key} className="h-24 animate-pulse rounded-2xl bg-card" />
          ))}
        </div>
      ) : tab === 'job' ? (
        <JobWorkCalculator defaults={defaults} />
      ) : (
        <SalesOrderCalculator defaults={defaults} />
      )}
    </div>
  );
}
