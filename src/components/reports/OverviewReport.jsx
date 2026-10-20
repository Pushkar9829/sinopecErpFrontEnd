import { Link } from 'react-router-dom';
import { fmt, totalOf } from '../../lib/reports';
import { GroupedBars, Kpi, KpiGrid, Panel, ReportTable } from './ReportKit';

// Same colours as on the Sales and Accounts tabs, so a figure keeps its colour.
const BOOKED = '#eb6834';
const BILLED = '#2a78d6';
const COLLECTED = '#1baf7a';
const money = (key) => (r) => r[key];

function Group({ title, to, linkLabel, children }) {
  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        {to ? (
          <Link to={to} className="text-sm font-semibold text-accent hover:underline print:hidden">
            {linkLabel}
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function OverviewReport({ data }) {
  const { money: m, production: p, customers: c } = data;
  const monthly = data.monthly.map((row) => ({ ...row, monthLabel: fmt.month(row.month) }));
  const productionTrimmed = p.from !== data.from;

  return (
    <div className="space-y-5">
      <Panel title="Needs attention today" hint="Click a line to open it">
        <ul className="grid gap-2 sm:grid-cols-2">
          {data.attention.map((a) => (
            <li key={a.id}>
              <Link to={a.to} className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm hover:bg-paper ${a.bad ? 'border-red-300 bg-red-50' : 'border-line'}`}>
                <span>
                  <span className="font-medium text-ink">{a.label}</span>
                  {a.hint ? <span className="block text-xs text-red-700">{a.hint}</span> : null}
                </span>
                <span className={`whitespace-nowrap font-semibold ${a.bad ? 'text-red-700' : 'text-ink'}`}>
                  {a.bad ? '! ' : ''}
                  {fmt[a.format](a.value)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Panel>

      <Group title="Money" to="/reports?tab=accounts" linkLabel="Accounts report →">
        <KpiGrid>
          <Kpi label="Orders booked" value={fmt.money(m.booked)} delta={m.bookedDelta} hint={`${m.orders} order(s)`} />
          <Kpi label="Billed" value={fmt.money(m.billed)} delta={m.billedDelta} />
          <Kpi label="Collected" value={fmt.money(m.collected)} delta={m.collectedDelta} />
          <Kpi label="GST on sales" value={fmt.money(m.gst)} />
          <Kpi label="Outstanding now" value={fmt.money(m.outstanding)} hint={m.dso != null ? `About ${m.dso} days of sales` : null} />
          <Kpi label="Overdue now" value={fmt.money(m.overdue)} tone={m.overdue > 0 ? 'bad' : 'good'} />
          <Kpi label="Open orders now" value={fmt.money(m.openValue)} hint={`${m.openOrders} not yet delivered`} />
        </KpiGrid>
      </Group>

      <Panel title="Booked, billed and collected by month">
        <GroupedBars
          data={monthly}
          labelKey="month"
          series={[
            { key: 'booked', label: 'Booked', color: BOOKED },
            { key: 'billed', label: 'Billed', color: BILLED },
            { key: 'collected', label: 'Collected', color: COLLECTED },
          ]}
          ariaLabel="Money booked, billed and collected per month"
        />
      </Panel>

      <Group title="Factory" to="/analytics" linkLabel="Production analytics →">
        {productionTrimmed ? (
          <p className="text-xs text-slate">
            Factory figures cover {fmt.date(p.from)} to {fmt.date(p.to)} (at most one year).
          </p>
        ) : null}
        <KpiGrid>
          <Kpi label="Output" value={p.outputText || '—'} delta={p.outputDelta} />
          <Kpi label="Waste" value={fmt.pct(p.wastePct)} tone={p.wastePct > 5 ? 'bad' : undefined} hint={p.wastePctDelta != null ? `${p.wastePctDelta > 0 ? '+' : ''}${p.wastePctDelta} points vs previous` : null} />
          <Kpi label="Yield" value={fmt.pct(p.yieldPct)} />
          <Kpi label="Dispatched" value={p.dispatchedText || '—'} />
          <Kpi label="Delivered on time" value={fmt.pct(p.onTimePct)} tone={p.onTimePct != null && p.onTimePct < 80 ? 'bad' : undefined} hint={`${fmt.int(p.delivered)} order(s) delivered`} />
          <Kpi label="Order to delivery" value={p.avgLeadDays != null ? `${p.avgLeadDays} days` : '—'} hint="Average" />
          <Kpi label="Operators working" value={fmt.int(p.operators)} />
        </KpiGrid>
      </Group>

      <Group title="Customers" to="/reports?tab=sales" linkLabel="Sales report →">
        <KpiGrid>
          <Kpi label="Ordering in the period" value={fmt.int(c.ordering)} />
          <Kpi label="New customers" value={fmt.int(c.newCustomers)} tone={c.newCustomers ? 'good' : undefined} />
          <Kpi label="Repeat customers" value={fmt.int(c.repeatCustomers)} />
          <Kpi label="Stopped ordering" value={fmt.int(c.lapsed)} tone={c.lapsed ? 'bad' : undefined} />
        </KpiGrid>
      </Group>

      <div className="grid gap-4 lg:grid-cols-2">
        <ReportTable
          title="Top customers (booked)"
          columns={[
            { key: 'name', label: 'Customer', render: (r) => (r.id ? <Link to={`/customers/${r.id}`} className="font-semibold text-accent hover:underline">{r.name}</Link> : r.name) },
            { key: 'orders', label: 'Orders', format: 'int' },
            { key: 'value', label: 'Value', format: 'money', csv: money('value') },
            { key: 'share', label: 'Share', format: 'pct' },
          ]}
          rows={c.top}
          empty="No orders in this period"
        />
        <ReportTable
          title="Who owes the most"
          columns={[
            { key: 'name', label: 'Customer', render: (r) => <Link to={`/customers/${r.id}/account`} className="font-semibold text-accent hover:underline">{r.name}</Link> },
            { key: 'outstanding', label: 'Outstanding', format: 'money' },
            { key: 'overdue', label: 'Overdue', format: 'money' },
          ]}
          rows={c.topDebtors}
          totals={c.topDebtors.length ? totalOf(c.topDebtors, ['outstanding', 'overdue']) : null}
          empty="No customer owes anything"
        />
      </div>
    </div>
  );
}
