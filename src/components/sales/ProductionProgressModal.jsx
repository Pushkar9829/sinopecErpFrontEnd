import { useEffect, useState } from 'react';
import { Badge, stepTone } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { formatQty, orderActiveStages, orderStageSummary, routeLabel } from '../../lib/sales';

const STAGE_TAB = {
  accent: {
    idle: 'border-orange-200 bg-orange-50 text-orange-950',
    active: 'border-orange-700 bg-orange-700 text-white',
    count: 'bg-orange-200 text-orange-950',
    countOn: 'bg-white/25 text-white',
  },
  info: {
    idle: 'border-sky-200 bg-sky-50 text-sky-950',
    active: 'border-sky-700 bg-sky-700 text-white',
    count: 'bg-sky-200 text-sky-950',
    countOn: 'bg-white/25 text-white',
  },
  purple: {
    idle: 'border-violet-200 bg-violet-50 text-violet-950',
    active: 'border-violet-700 bg-violet-700 text-white',
    count: 'bg-violet-200 text-violet-950',
    countOn: 'bg-white/25 text-white',
  },
  teal: {
    idle: 'border-teal-200 bg-teal-50 text-teal-950',
    active: 'border-teal-700 bg-teal-700 text-white',
    count: 'bg-teal-200 text-teal-950',
    countOn: 'bg-white/25 text-white',
  },
  success: {
    idle: 'border-emerald-200 bg-emerald-50 text-emerald-950',
    active: 'border-emerald-700 bg-emerald-700 text-white',
    count: 'bg-emerald-200 text-emerald-950',
    countOn: 'bg-white/25 text-white',
  },
  muted: {
    idle: 'border-line bg-paper text-ink',
    active: 'border-ink bg-ink text-paper',
    count: 'bg-white text-ink',
    countOn: 'bg-white/25 text-white',
  },
};

function Stat({ label, value }) {
  return (
    <div className="rounded-lg border border-line bg-paper/70 px-3 py-2.5">
      <p className="text-sm font-semibold text-slate">{label}</p>
      <p className="mt-1 text-lg font-semibold text-ink">{value}</p>
    </div>
  );
}

function stageStatus(stage) {
  if (!stage) return null;
  if (stage.done) return <Badge tone="success">Done</Badge>;
  if (stage.active) return <Badge tone="accent">In progress</Badge>;
  if (stage.output > 0) return <Badge tone="info">Started</Badge>;
  return <Badge tone="muted">Waiting</Badge>;
}

export function ProductionProgressModal({ order, onClose }) {
  const stages = order ? orderStageSummary(order) : [];
  const current = order ? orderActiveStages(order) : [];
  const [tab, setTab] = useState('');

  useEffect(() => {
    if (!order) {
      setTab('');
      return;
    }
    const summary = orderStageSummary(order);
    const active = orderActiveStages(order);
    setTab(active[0] || summary[0]?.id || '');
  }, [order]);

  if (!order) return null;

  const stage = stages.find((row) => row.id === tab) || stages[0];

  return (
    <Modal
      open
      wide="xl"
      onClose={onClose}
      title={
        <div>
          <h2 className="text-lg font-semibold text-ink">{order.number}</h2>
          <p className="mt-0.5 text-sm font-normal text-slate">{order.customer?.name || '—'}</p>
        </div>
      }
    >
      <div className="flex gap-2 overflow-x-auto pb-1">
        {stages.map((row) => {
          const tone = STAGE_TAB[stepTone(row.id)] || STAGE_TAB.muted;
          const active = row.id === stage?.id;
          const now = current.includes(row.id);
          return (
            <button
              key={row.id}
              type="button"
              onClick={() => setTab(row.id)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-left ${active ? tone.active : tone.idle}`}
            >
              <span className="text-sm font-semibold">{row.label}</span>
              {now ? (
                <span className={`rounded-full px-1.5 py-0.5 text-xs font-semibold ${active ? 'bg-white/20' : 'bg-white'}`}>
                  Now
                </span>
              ) : null}
              <span
                className={`inline-flex min-w-6 items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-semibold ${
                  active ? tone.countOn : tone.count
                }`}
              >
                {row.lines.length}
              </span>
            </button>
          );
        })}
      </div>

      {stage ? (
        <section className="mt-4 overflow-hidden rounded-xl border border-line">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-paper/50 px-4 py-3">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-ink">{stage.label}</h3>
              {stageStatus(stage)}
            </div>
            <p className="text-sm font-normal text-slate">
              {stage.lines.length} product{stage.lines.length === 1 ? '' : 's'} on this stage
            </p>
          </div>
          <div className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-5">
            <Stat label="Target" value={formatQty(stage.target)} />
            <Stat label="Input" value={formatQty(stage.input)} />
            <Stat label="Produced" value={formatQty(stage.output)} />
            <Stat label="Waste" value={formatQty(stage.waste)} />
            <Stat label="Remaining" value={formatQty(stage.remaining)} />
          </div>
          <div className="overflow-x-auto px-4 pb-4">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-paper text-ink">
                <tr>
                  <th className="px-3 py-2 font-semibold">Product</th>
                  <th className="px-3 py-2 font-semibold">Route</th>
                  <th className="px-3 py-2 text-right font-semibold">In</th>
                  <th className="px-3 py-2 text-right font-semibold">Out</th>
                  <th className="px-3 py-2 text-right font-semibold">Waste</th>
                  <th className="px-3 py-2 text-right font-semibold">Left</th>
                </tr>
              </thead>
              <tbody>
                {stage.lines.map((line) => (
                  <tr key={line.id} className={`border-t border-line ${line.current ? 'bg-orange-50/80' : ''}`}>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-ink">{line.productCode || line.product}</p>
                        {line.current ? <Badge tone="accent">Now</Badge> : null}
                      </div>
                      {line.product && line.productCode ? (
                        <p className="text-sm font-normal text-slate">{line.product}</p>
                      ) : null}
                      <p className="text-sm font-normal text-slate">
                        {formatQty(line.target)} {line.unit}
                      </p>
                    </td>
                    <td className="px-3 py-2.5 font-normal text-slate">{routeLabel(line.route)}</td>
                    <td className="px-3 py-2.5 text-right font-normal text-ink">{formatQty(line.input)}</td>
                    <td className="px-3 py-2.5 text-right font-normal text-ink">{formatQty(line.output)}</td>
                    <td className="px-3 py-2.5 text-right font-normal text-ink">{formatQty(line.waste)}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-ink">{formatQty(line.remaining)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </Modal>
  );
}
