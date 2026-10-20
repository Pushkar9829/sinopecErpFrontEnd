import { useState } from 'react';
import { Link } from 'react-router-dom';
import { fmt, totalOf } from '../../lib/reports';
import { Tabs } from '../ui/Tabs';
import { GroupedBars, Kpi, KpiGrid, Panel, ReportTable, ShareBars } from './ReportKit';

const SALES_ORDERS = '#eb6834';
const JOB_WORK = '#6250d6';
const money = (key) => (r) => r[key];
const customerLink = (r) => (r.id ? <Link to={`/customers/${r.id}`} className="font-semibold text-accent hover:underline">{r.name}</Link> : r.name);
const GROUP_TABS = [
  { id: 'products', label: 'Products' },
  { id: 'materials', label: 'Materials' },
  { id: 'sizes', label: 'Size & gauge' },
];

export function SalesReport({ data }) {
  const [group, setGroup] = useState('products');
  const { kpis } = data;
  const stamp = `${data.from}_to_${data.to}`;
  const monthly = data.monthly.map((m) => ({ ...m, monthLabel: fmt.month(m.month) }));
  const groupRows = data[group];
  const groupLabel = GROUP_TABS.find((g) => g.id === group).label;

  return (
    <div className="space-y-4">
      <KpiGrid>
        <Kpi label="Orders booked" value={fmt.money(kpis.bookedValue)} delta={kpis.bookedDelta} hint={`${kpis.orders} order(s)`} />
        <Kpi label="Average order" value={fmt.money(kpis.averageOrder)} />
        <Kpi label="Customers ordering" value={fmt.int(kpis.customers)} hint={`${kpis.newCustomers} new · ${kpis.repeatCustomers} repeat`} />
        <Kpi label="Job work share" value={kpis.jobWorkShare != null ? fmt.pct(kpis.jobWorkShare) : '—'} hint={`Job work ${fmt.money(kpis.jobWorkValue)}`} />
        <Kpi label="Open orders now" value={fmt.money(kpis.openValue)} hint={`${kpis.openOrders} order(s) not yet delivered`} />
        <Kpi label="Late open orders" value={fmt.int(kpis.lateOpenOrders)} tone={kpis.lateOpenOrders ? 'bad' : 'good'} hint="Past the promised delivery date" />
        <Kpi label="Stopped ordering" value={fmt.int(kpis.lapsedCustomers)} tone={kpis.lapsedCustomers ? 'bad' : undefined} hint={`No order for ${kpis.lapsedDays}+ days`} />
        <Kpi label="Cancelled" value={fmt.int(kpis.cancelled)} hint={kpis.cancelled ? fmt.money(kpis.cancelledValue) : null} />
      </KpiGrid>

      <Panel title="Orders booked by month" hint={kpis.fromDrafts ? `${kpis.fromDrafts} of the orders in the period came from WhatsApp or email draft orders.` : null}>
        <GroupedBars
          data={monthly}
          labelKey="month"
          series={[
            { key: 'salesOrders', label: 'Sales orders', color: SALES_ORDERS },
            { key: 'jobWork', label: 'Job work', color: JOB_WORK },
          ]}
          ariaLabel="Value of sales orders and job work booked per month"
        />
      </Panel>

      <ReportTable
        title="Monthly bookings"
        fileName={`bookings-by-month_${stamp}`}
        columns={[
          { key: 'month', label: 'Month', format: 'month' },
          { key: 'orders', label: 'Orders', format: 'int' },
          { key: 'salesOrders', label: 'Sales orders', format: 'money', csv: money('salesOrders') },
          { key: 'jobWork', label: 'Job work', format: 'money', csv: money('jobWork') },
          { key: 'value', label: 'Total booked', format: 'money', csv: money('value') },
        ]}
        rows={data.monthly}
        totals={totalOf(data.monthly, ['orders', 'salesOrders', 'jobWork', 'value'])}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Open orders by stage" hint="All orders not yet delivered, today">
          <ShareBars rows={data.pipeline.filter((p) => p.orders > 0)} labelKey="label" valueKey="value" color={SALES_ORDERS} />
        </Panel>
        <Panel title="Biggest customers in the period">
          <ShareBars rows={data.customers.slice(0, 8)} labelKey="name" valueKey="value" color={SALES_ORDERS} />
        </Panel>
      </div>

      <ReportTable
        title="Customers"
        hint="Everyone who ordered in the period. New = their first order ever was in this period."
        fileName={`customers-booked_${stamp}`}
        columns={[
          { key: 'name', label: 'Customer', render: customerLink, csv: (r) => r.name },
          { key: 'code', label: 'Code' },
          { key: 'isNew', label: 'New?', render: (r) => (r.isNew ? 'New' : 'Repeat'), csv: (r) => (r.isNew ? 'New' : 'Repeat') },
          { key: 'orders', label: 'Orders', format: 'int' },
          { key: 'jobWork', label: 'Of which job work', format: 'int' },
          { key: 'value', label: 'Value', format: 'money', csv: money('value') },
          { key: 'average', label: 'Average order', format: 'money', csv: money('average') },
          { key: 'share', label: 'Share', format: 'pct', csv: (r) => r.share ?? '' },
          { key: 'last', label: 'Last order', format: 'date' },
        ]}
        rows={data.customers}
        totals={totalOf(data.customers, ['orders', 'jobWork', 'value'])}
        limit={25}
      />

      <Panel title={`What was sold, by ${groupLabel.toLowerCase()}`}>
        <div className="print:hidden">
          <Tabs tabs={GROUP_TABS.map((g) => ({ ...g, count: data[g.id].length }))} value={group} onChange={setGroup} />
        </div>
      </Panel>
      <ReportTable
        title={groupLabel}
        hint="From the lines of orders booked in the period. Values are before GST, so the total is lower than the bookings above."
        fileName={`sold-by-${group}_${stamp}`}
        columns={[
          { key: 'name', label: groupLabel },
          { key: 'quantityText', label: 'Quantity' },
          { key: 'orders', label: 'Orders', format: 'int' },
          { key: 'customers', label: 'Customers', format: 'int' },
          { key: 'value', label: 'Value before GST', format: 'money', csv: money('value') },
          { key: 'share', label: 'Share', format: 'pct', csv: (r) => r.share ?? '' },
        ]}
        rows={groupRows}
        totals={totalOf(groupRows, ['value'])}
        limit={25}
      />

      <ReportTable
        title={`Customers who stopped ordering (no order for ${kpis.lapsedDays}+ days)`}
        hint="Ordered in the last 12 months but not recently, most valuable first. Worth a call."
        fileName={`stopped-ordering_${data.to}`}
        columns={[
          { key: 'name', label: 'Customer', render: customerLink, csv: (r) => r.name },
          { key: 'code', label: 'Code' },
          { key: 'lastOrder', label: 'Last order', format: 'date' },
          { key: 'daysSince', label: 'Days since', format: 'int' },
          { key: 'ordersLastYear', label: 'Orders in last 12 months', format: 'int' },
          { key: 'valueLastYear', label: 'Value in last 12 months', format: 'money', csv: money('valueLastYear') },
        ]}
        rows={data.lapsed}
        empty="Every recent customer has ordered lately"
        limit={25}
      />

      <ReportTable
        title="Open orders by stage"
        fileName={`open-orders_${data.to}`}
        columns={[
          { key: 'label', label: 'Stage' },
          { key: 'orders', label: 'Orders', format: 'int' },
          { key: 'value', label: 'Value', format: 'money', csv: money('value') },
        ]}
        rows={data.pipeline}
        totals={totalOf(data.pipeline, ['orders', 'value'])}
      />

      {data.cancelledOrders.length ? (
        <ReportTable
          title="Cancelled orders"
          fileName={`cancelled-orders_${stamp}`}
          columns={[
            { key: 'date', label: 'Order date', format: 'date' },
            { key: 'number', label: 'Order', render: (r) => <Link to={`/sales-orders/${r.id}`} className="font-semibold text-accent hover:underline">{r.number}</Link>, csv: (r) => r.number },
            { key: 'customer', label: 'Customer' },
            { key: 'value', label: 'Value', format: 'money', csv: money('value') },
          ]}
          rows={data.cancelledOrders}
          totals={totalOf(data.cancelledOrders, ['value'])}
        />
      ) : null}
    </div>
  );
}
