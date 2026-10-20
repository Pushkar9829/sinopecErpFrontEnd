import { fmt, totalOf } from '../../lib/reports';
import { TASK_CATEGORY_LABELS } from '../../lib/tasks';
import { GroupedBars, Kpi, KpiGrid, Panel, ReportTable, ShareBars } from './ReportKit';

const RECEIVED = '#2a78d6';
const ORDERS = '#eb6834';
const CONVERTED = '#1baf7a';
const count = (v) => (Number.isInteger(v) ? String(v) : '');

export function OperationsReport({ data }) {
  const { kpis } = data;
  const stamp = `${data.from}_to_${data.to}`;
  const months = data.draftsByMonth.map((m) => ({ ...m, monthLabel: fmt.month(m.month) }));

  return (
    <div className="space-y-4">
      <KpiGrid>
        <Kpi label="Tasks open now" value={fmt.int(kpis.tasksOpen)} hint={`${kpis.tasksOverdue} past due`} tone={kpis.tasksOverdue ? 'bad' : 'good'} />
        <Kpi label="Tasks finished" value={fmt.int(kpis.tasksDone)} hint={kpis.doneOnTimePct != null ? `${fmt.pct(kpis.doneOnTimePct)} by the due date` : null} />
        <Kpi label="Tasks created" value={fmt.int(kpis.tasksMade)} />
        <Kpi label="Days to finish a task" value={kpis.avgDaysToFinish != null ? `${kpis.avgDaysToFinish} days` : '—'} hint="Average, created to done" />
        <Kpi label="Messages received" value={fmt.int(kpis.draftsReceived)} hint={`${kpis.draftsOrders} looked like orders`} />
        <Kpi label="Turned into orders" value={fmt.int(kpis.draftsConverted)} hint={kpis.conversionPct != null ? `${fmt.pct(kpis.conversionPct)} of order messages` : null} />
        <Kpi label="Review time" value={kpis.avgReviewHours != null ? `${kpis.avgReviewHours} hours` : '—'} hint={`${kpis.waitingReview} waiting now`} tone={kpis.waitingReview ? 'bad' : undefined} />
        <Kpi label="AI readings" value={fmt.int(kpis.readOk + kpis.readFailed)} hint={`${kpis.readFailed} failed · ${fmt.int(kpis.aiTokens)} tokens`} />
      </KpiGrid>

      <ReportTable
        title="Tasks by person"
        hint="Open and overdue are as of today; created and finished are in the period."
        fileName={`tasks-by-person_${stamp}`}
        columns={[
          { key: 'who', label: 'Person / team' },
          { key: 'open', label: 'Open now', format: 'int' },
          { key: 'overdue', label: 'Overdue now', format: 'int' },
          { key: 'made', label: 'Given', format: 'int' },
          { key: 'done', label: 'Finished', format: 'int' },
          { key: 'avgDays', label: 'Days to finish', format: 'days', csv: (r) => r.avgDays ?? '' },
        ]}
        rows={data.people}
        totals={totalOf(data.people, ['open', 'overdue', 'made', 'done'])}
        empty="No tasks"
      />

      <ReportTable
        title="Tasks by kind"
        fileName={`tasks-by-kind_${stamp}`}
        columns={[
          { key: 'category', label: 'Kind', render: (r) => TASK_CATEGORY_LABELS[r.category] || r.category, csv: (r) => TASK_CATEGORY_LABELS[r.category] || r.category },
          { key: 'made', label: 'Created', format: 'int' },
          { key: 'auto', label: 'Of which automatic', format: 'int' },
          { key: 'done', label: 'Finished', format: 'int' },
        ]}
        rows={data.taskKinds}
        totals={totalOf(data.taskKinds, ['made', 'auto', 'done'])}
        empty="No tasks in this period"
      />

      <Panel title="Draft orders by month" hint="WhatsApp and email messages received, how many looked like orders, and how many became orders">
        <GroupedBars
          data={months}
          labelKey="month"
          series={[
            { key: 'received', label: 'Received', color: RECEIVED },
            { key: 'orders', label: 'Looked like orders', color: ORDERS },
            { key: 'converted', label: 'Became orders', color: CONVERTED },
          ]}
          format={count}
          fullFormat={(v) => `${v}`}
          ariaLabel="Draft order messages per month"
        />
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="What happened to the messages">
          <ShareBars rows={data.draftOutcomes.filter((o) => o.count > 0)} labelKey="label" valueKey="count" color={RECEIVED} format={(v) => `${v}`} />
        </Panel>
        <ReportTable
          title="By channel"
          fileName={`drafts-by-channel_${stamp}`}
          columns={[
            { key: 'label', label: 'Channel' },
            { key: 'received', label: 'Received', format: 'int' },
            { key: 'orders', label: 'Orders', format: 'int' },
            { key: 'converted', label: 'Became orders', format: 'int' },
            { key: 'discarded', label: 'Discarded', format: 'int' },
          ]}
          rows={data.draftsByChannel}
          totals={totalOf(data.draftsByChannel, ['received', 'orders', 'converted', 'discarded'])}
          empty="No messages in this period"
        />
      </div>

      <ReportTable
        title="AI reader use by day"
        hint="One row per day the AI read messages. Kept for 180 days."
        fileName={`ai-use_${stamp}`}
        columns={[
          { key: 'day', label: 'Day', format: 'date' },
          { key: 'calls', label: 'Readings', format: 'int' },
          { key: 'failed', label: 'Failed', format: 'int' },
          { key: 'inputTokens', label: 'Input tokens', format: 'int' },
          { key: 'outputTokens', label: 'Output tokens', format: 'int' },
        ]}
        rows={data.aiByDay}
        totals={totalOf(data.aiByDay, ['calls', 'failed', 'inputTokens', 'outputTokens'])}
        empty="The AI reader was not used in this period"
      />
    </div>
  );
}
