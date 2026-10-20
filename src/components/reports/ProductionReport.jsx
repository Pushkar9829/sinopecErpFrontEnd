import { Link } from 'react-router-dom';
import { fmt } from '../../lib/reports';
import { GroupedBars, Kpi, KpiGrid, Panel, ReportTable } from './ReportKit';

// The app's stage colours, so each stage looks the same as on the floor screens.
const STAGE_COLORS = { rolling: '#ea580c', printing: '#0284c7', cutting: '#7c3aed' };
const pctLabel = (v) => `${Math.round(v * 10) / 10}%`;
const orderLink = (r) => <Link to={`/sales-orders/${r.orderId}`} className="font-semibold text-accent hover:underline">{r.number}</Link>;

export function ProductionReport({ data }) {
  const { kpis } = data;
  const stamp = `${data.from}_to_${data.to}`;
  const trend = data.wasteTrend.map((m) => ({ ...m, monthLabel: fmt.month(m.month) }));

  return (
    <div className="space-y-4">
      <KpiGrid>
        <Kpi
          label="Rolling waste"
          value={fmt.pct(kpis.wastePctByStage.rolling)}
          tone={kpis.wastePctByStage.rolling > 5 ? 'bad' : undefined}
          hint={`Printing ${fmt.pct(kpis.wastePctByStage.printing)} · Cutting ${fmt.pct(kpis.wastePctByStage.cutting)} · ${fmt.int(kpis.entries)} entries`}
        />
        <Kpi label="Approval to first work" value={kpis.approvalToStartDays != null ? `${kpis.approvalToStartDays} days` : '—'} hint="Average, lines started in the period" />
        <Kpi label="Approval to dispatch" value={kpis.approvalToDispatchDays != null ? `${kpis.approvalToDispatchDays} days` : '—'} hint="Average, lines dispatched in the period" />
        <Kpi label="Slowest stage" value={kpis.slowestStage || '—'} hint={kpis.slowestDays != null ? `${kpis.slowestDays} days waiting + working` : null} />
        <Kpi label="Lines in progress now" value={fmt.int(kpis.linesInProgress)} hint={kpis.mostStuckStage ? `Most at ${kpis.mostStuckStage} (${kpis.mostStuckLines})` : null} />
        <Kpi label="Waiting over 7 days" value={fmt.int(kpis.waitingOver7Days)} tone={kpis.waitingOver7Days ? 'bad' : 'good'} hint="Lines with no movement for a week" />
        <Kpi label="Lines on late orders" value={fmt.int(kpis.linesLate)} tone={kpis.linesLate ? 'bad' : 'good'} hint="Past the promised delivery date" />
      </KpiGrid>

      <ReportTable
        title="Work in progress now, by stage"
        hint="Where every open order line is waiting today. Remaining = what that stage still has to make."
        fileName={`work-in-progress_${data.to}`}
        columns={[
          { key: 'label', label: 'Stage' },
          { key: 'lines', label: 'Lines', format: 'int' },
          { key: 'orders', label: 'Orders', format: 'int' },
          { key: 'notStarted', label: 'Not started', format: 'int' },
          { key: 'remainingText', label: 'Remaining' },
          { key: 'avgWaitingDays', label: 'Average wait', format: 'days', csv: (r) => r.avgWaitingDays ?? '' },
          { key: 'oldestDays', label: 'Longest wait', format: 'days', csv: (r) => r.oldestDays ?? '' },
          { key: 'late', label: 'On late orders', format: 'int' },
        ]}
        rows={data.wip}
      />

      <ReportTable
        title="How long each stage takes"
        hint="For stages finished in the period. Waiting = from the previous stage finishing (or approval) to work starting here; working = first to last entry here."
        fileName={`stage-times_${stamp}`}
        columns={[
          { key: 'label', label: 'Stage' },
          { key: 'lines', label: 'Lines finished', format: 'int' },
          { key: 'avgWaitDays', label: 'Average waiting', format: 'days', csv: (r) => r.avgWaitDays ?? '' },
          { key: 'avgWorkDays', label: 'Average working', format: 'days', csv: (r) => r.avgWorkDays ?? '' },
          { key: 'avgTotalDays', label: 'Total', format: 'days', csv: (r) => r.avgTotalDays ?? '' },
        ]}
        rows={data.stageTimes}
      />

      <ReportTable
        title="Lines waiting longest"
        hint="Open lines, longest without movement first. Customer codes are shown to everyone except the owner."
        fileName={`lines-waiting_${data.to}`}
        columns={[
          { key: 'number', label: 'Order', render: orderLink, csv: (r) => r.number },
          { key: 'customer', label: 'Customer' },
          { key: 'product', label: 'Product' },
          { key: 'stageLabel', label: 'At stage' },
          { key: 'started', label: 'Started?', render: (r) => (r.started ? 'Started' : 'Not started'), csv: (r) => (r.started ? 'Started' : 'Not started') },
          { key: 'remaining', label: 'Remaining', render: (r) => `${fmt.qty(r.remaining)} ${r.unit}`, csv: (r) => `${r.remaining} ${r.unit}` },
          { key: 'daysWaiting', label: 'Waiting', format: 'days', csv: (r) => r.daysWaiting ?? '' },
          { key: 'deliveryDate', label: 'Promised', render: (r) => <span className={r.late ? 'font-semibold text-red-700' : ''}>{fmt.date(r.deliveryDate)}</span>, csv: (r) => fmt.date(r.deliveryDate) },
        ]}
        rows={data.waiting}
        limit={25}
        empty="Nothing in progress"
      />

      <Panel title="Waste % by month and stage" hint="Waste ÷ (output + waste) for each stage">
        <GroupedBars
          data={trend}
          labelKey="month"
          series={[
            { key: 'rollingWastePct', label: 'Rolling', color: STAGE_COLORS.rolling },
            { key: 'printingWastePct', label: 'Printing', color: STAGE_COLORS.printing },
            { key: 'cuttingWastePct', label: 'Cutting', color: STAGE_COLORS.cutting },
          ]}
          format={pctLabel}
          fullFormat={fmt.pct}
          ariaLabel="Waste percentage per stage per month"
        />
      </Panel>

      <ReportTable
        title="Output and waste by stage"
        hint="Rolling is in kg; printing and cutting in the order's unit. Change = waste % points vs the previous period."
        fileName={`stage-output_${stamp}`}
        columns={[
          { key: 'label', label: 'Stage' },
          { key: 'entries', label: 'Entries', format: 'int' },
          { key: 'outputText', label: 'Output' },
          { key: 'waste', label: 'Waste', format: 'qty' },
          { key: 'wastePct', label: 'Waste %', format: 'pct', csv: (r) => r.wastePct ?? '' },
          { key: 'wastePctChange', label: 'Change', render: (r) => (r.wastePctChange == null ? '—' : `${r.wastePctChange > 0 ? '+' : ''}${r.wastePctChange} pts`), csv: (r) => r.wastePctChange ?? '' },
        ]}
        rows={data.stages}
      />

      <ReportTable
        title="Rolling waste by material"
        hint="Material is used up at rolling, so this is rolling output and waste in kg."
        fileName={`waste-by-material_${stamp}`}
        columns={[
          { key: 'material', label: 'Material' },
          { key: 'orders', label: 'Orders', format: 'int' },
          { key: 'entries', label: 'Entries', format: 'int' },
          { key: 'output', label: 'Output (kg)', format: 'qty' },
          { key: 'waste', label: 'Waste (kg)', format: 'qty' },
          { key: 'wastePct', label: 'Waste %', format: 'pct', csv: (r) => r.wastePct ?? '' },
        ]}
        rows={data.materials}
        extraActions={
          <Link to="/analytics" className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-semibold hover:bg-paper">
            By operator & machine →
          </Link>
        }
      />
    </div>
  );
}
