import { Link } from 'react-router-dom';
import { fmt, totalOf } from '../../lib/reports';
import { GroupedBars, Kpi, KpiGrid, Panel, ReportTable } from './ReportKit';

const ON_TIME = '#2a78d6';
const LATE = '#eb6834';
const orderLink = (key = 'id') => (r) => <Link to={`/sales-orders/${r[key]}`} className="font-semibold text-accent hover:underline">{r.number}</Link>;
const lateText = (d) => (d == null ? 'No date promised' : d === 0 ? 'On time' : `${d} day(s) late`);

export function DispatchReport({ data }) {
  const { kpis } = data;
  const stamp = `${data.from}_to_${data.to}`;
  const monthly = data.monthly.map((m) => ({ ...m, monthLabel: fmt.month(m.month) }));

  return (
    <div className="space-y-4">
      <KpiGrid>
        <Kpi
          label="Delivered on time"
          value={fmt.pct(kpis.onTimePct)}
          tone={kpis.onTimePct != null && kpis.onTimePct < 80 ? 'bad' : undefined}
          hint={`${kpis.onTime} on time · ${kpis.late} late${kpis.onTimeChange != null ? ` · ${kpis.onTimeChange > 0 ? '+' : ''}${kpis.onTimeChange} pts vs previous` : ''}`}
        />
        <Kpi label="Orders delivered" value={fmt.int(kpis.delivered)} hint={kpis.avgLeadDays != null ? `Average ${kpis.avgLeadDays} days from order` : null} />
        <Kpi label="When late, by" value={kpis.avgDaysLate != null ? `${kpis.avgDaysLate} days` : '—'} hint="Average delay of late orders" />
        <Kpi label="Dispatched" value={kpis.dispatchedText || '—'} hint={`${kpis.dispatchEntries} dispatch(es) on ${kpis.dispatchDays} day(s)`} />
        <Kpi label="Open orders late now" value={fmt.int(kpis.lateNow)} tone={kpis.lateNow ? 'bad' : 'good'} />
        <Kpi label="Due in the next 7 days" value={fmt.int(kpis.dueSoon)} />
      </KpiGrid>

      <Panel title="On time vs late, by month" hint="Orders fully delivered in each month">
        <GroupedBars
          data={monthly}
          labelKey="month"
          series={[
            { key: 'onTime', label: 'On time', color: ON_TIME },
            { key: 'late', label: 'Late', color: LATE },
          ]}
          format={(v) => (Number.isInteger(v) ? String(v) : '')}
          fullFormat={(v) => `${v} order(s)`}
          ariaLabel="Orders delivered on time and late per month"
        />
      </Panel>

      <ReportTable
        title="Open orders past the promised date"
        hint="Not fully delivered yet. Chase these first."
        fileName={`late-open-orders_${data.to}`}
        columns={[
          { key: 'number', label: 'Order', render: orderLink(), csv: (r) => r.number },
          { key: 'customer', label: 'Customer' },
          { key: 'promised', label: 'Promised', format: 'date' },
          { key: 'daysLate', label: 'Days late', format: 'int' },
          { key: 'stageNow', label: 'Stage now' },
        ]}
        rows={data.lateNow}
        empty="No open order is late"
      />

      <ReportTable
        title="Due in the next 7 days"
        fileName={`due-soon_${data.to}`}
        columns={[
          { key: 'number', label: 'Order', render: orderLink(), csv: (r) => r.number },
          { key: 'customer', label: 'Customer' },
          { key: 'promised', label: 'Promised', format: 'date' },
          { key: 'dueInDays', label: 'Due in', render: (r) => (r.dueInDays === 0 ? 'Today' : `${r.dueInDays} day(s)`), csv: (r) => r.dueInDays },
          { key: 'stageNow', label: 'Stage now' },
        ]}
        rows={data.dueSoon}
        empty="Nothing due in the next week"
      />

      <ReportTable
        title="On-time delivery by customer"
        fileName={`on-time-by-customer_${stamp}`}
        columns={[
          { key: 'customer', label: 'Customer' },
          { key: 'delivered', label: 'Delivered', format: 'int' },
          { key: 'onTime', label: 'On time', format: 'int' },
          { key: 'late', label: 'Late', format: 'int' },
          { key: 'onTimePct', label: 'On time %', format: 'pct', csv: (r) => r.onTimePct ?? '' },
          { key: 'avgDaysLate', label: 'Average delay', format: 'days', csv: (r) => r.avgDaysLate ?? '' },
          { key: 'avgLeadDays', label: 'Order to delivery', format: 'days', csv: (r) => r.avgLeadDays ?? '' },
        ]}
        rows={data.byCustomer}
        totals={totalOf(data.byCustomer, ['delivered', 'onTime', 'late'])}
        empty="No order was delivered in this period"
      />

      <ReportTable
        title="Orders delivered"
        fileName={`orders-delivered_${stamp}`}
        columns={[
          { key: 'deliveredAt', label: 'Delivered', format: 'date' },
          { key: 'number', label: 'Order', render: orderLink(), csv: (r) => r.number },
          { key: 'customer', label: 'Customer' },
          { key: 'orderDate', label: 'Ordered', format: 'date' },
          { key: 'promised', label: 'Promised', format: 'date' },
          { key: 'daysLate', label: 'Result', render: (r) => <span className={r.daysLate > 0 ? 'font-semibold text-red-700' : ''}>{lateText(r.daysLate)}</span>, csv: (r) => lateText(r.daysLate) },
          { key: 'leadDays', label: 'Took', format: 'days', csv: (r) => r.leadDays ?? '' },
        ]}
        rows={data.delivered}
        empty="No order was delivered in this period"
      />

      <ReportTable
        title="Dispatches per day"
        fileName={`dispatch-by-day_${stamp}`}
        columns={[
          { key: 'day', label: 'Day', format: 'date' },
          { key: 'entries', label: 'Dispatches', format: 'int' },
          { key: 'orders', label: 'Orders', format: 'int' },
          { key: 'quantityText', label: 'Quantity' },
          { key: 'vehicles', label: 'Vehicles' },
        ]}
        rows={data.byDay}
        totals={totalOf(data.byDay, ['entries'])}
      />

      <ReportTable
        title="Dispatch register"
        hint="Every dispatch entry in the period."
        fileName={`dispatch-register_${stamp}`}
        columns={[
          { key: 'date', label: 'Date', format: 'date' },
          { key: 'number', label: 'Order', render: orderLink('orderId'), csv: (r) => r.number },
          { key: 'customer', label: 'Customer' },
          { key: 'product', label: 'Product' },
          { key: 'quantity', label: 'Quantity', render: (r) => `${fmt.qty(r.quantity)} ${r.unit}`, csv: (r) => r.quantity },
          { key: 'unit', label: 'Unit', csvOnly: true },
          { key: 'vehicle', label: 'Vehicle' },
          { key: 'partner', label: 'Delivery partner' },
          { key: 'handover', label: 'Handed to' },
          { key: 'by', label: 'Entered by' },
        ]}
        rows={data.entries}
      />
    </div>
  );
}
