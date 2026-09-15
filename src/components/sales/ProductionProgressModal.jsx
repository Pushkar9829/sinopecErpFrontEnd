import { useEffect, useState } from 'react';
import { Badge, stepTone } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { Tabs } from '../ui/Tabs';
import { formatQty, orderActiveStages, orderStageSummary, routeLabel, stageLabel } from '../../lib/sales';

function Stat({ label, value, hint }) {
  return (
    <div className="rounded-lg border border-line bg-paper/60 px-3 py-2">
      <p className="text-xs uppercase tracking-wide text-steel">{label}</p>
      <p className="mt-0.5 text-sm font-medium">{value}</p>
      {hint ? <p className="text-xs text-slate">{hint}</p> : null}
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
      wide
      onClose={onClose}
      title={
        <div>
          <h2 className="text-lg font-semibold text-ink">{order.number} · production</h2>
          <p className="mt-0.5 text-sm text-slate">{order.customer?.name || '—'}</p>
        </div>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase tracking-wide text-steel">Now at</span>
        {current.length ? (
          current.map((id) => (
            <button key={id} type="button" onClick={() => setTab(id)}>
              <Badge tone="accent">{stageLabel(id)}</Badge>
            </button>
          ))
        ) : (
          <span className="text-sm text-slate">All listed stages are done</span>
        )}
      </div>

      <Tabs
        tabs={stages.map((row) => ({
          id: row.id,
          label: row.label,
          count: row.lines.length,
          tone: stepTone(row.id),
        }))}
        value={stage?.id || tab}
        onChange={setTab}
      />

      {stage ? (
        <section className="mt-4 rounded-xl border border-line">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
            <div className="flex items-center gap-2">
              <h3 className="font-medium">{stage.label}</h3>
              {stageStatus(stage)}
            </div>
            <p className="text-xs text-slate">
              {stage.lines.length} product{stage.lines.length === 1 ? '' : 's'} on this stage
            </p>
          </div>
          <div className="grid gap-2 p-4 sm:grid-cols-4">
            <Stat label="Target" value={formatQty(stage.target)} />
            <Stat label="Produced" value={formatQty(stage.output)} hint={`Input ${formatQty(stage.input)}`} />
            <Stat label="Waste" value={formatQty(stage.waste)} />
            <Stat label="Remaining" value={formatQty(stage.remaining)} />
          </div>
          <div className="overflow-x-auto px-4 pb-4">
            <table className="min-w-full text-left text-sm">
              <thead className="text-slate">
                <tr>
                  <th className="py-1 pr-3 font-medium">Product</th>
                  <th className="py-1 pr-3 font-medium">Route</th>
                  <th className="py-1 pr-3 font-medium">In</th>
                  <th className="py-1 pr-3 font-medium">Out</th>
                  <th className="py-1 pr-3 font-medium">Waste</th>
                  <th className="py-1 font-medium">Left</th>
                </tr>
              </thead>
              <tbody>
                {stage.lines.map((line) => (
                  <tr key={line.id} className="border-t border-line">
                    <td className="py-2 pr-3">
                      <p className="font-medium">
                        {line.productCode || line.product}
                        {line.current ? <span className="ml-2 text-xs font-normal text-accent">now</span> : null}
                      </p>
                      <p className="text-xs text-slate">
                        {formatQty(line.target)} {line.unit}
                      </p>
                    </td>
                    <td className="py-2 pr-3 text-slate">{routeLabel(line.route)}</td>
                    <td className="py-2 pr-3">{formatQty(line.input)}</td>
                    <td className="py-2 pr-3">{formatQty(line.output)}</td>
                    <td className="py-2 pr-3">{formatQty(line.waste)}</td>
                    <td className="py-2">{formatQty(line.remaining)}</td>
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
