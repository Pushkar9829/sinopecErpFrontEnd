import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Tabs } from '../ui/Tabs';
import { downloadTable, fmt, totalOf } from '../../lib/reports';
import { ExportButton, GroupedBars, Kpi, KpiGrid, Panel, ReportTable, ShareBars } from './ReportKit';

const BILLED = '#2a78d6';
const COLLECTED = '#1baf7a';
const AGEING = [
  ['current', 'Not due yet'],
  ['d1_30', '1–30 days late'],
  ['d31_60', '31–60 days late'],
  ['d61_90', '61–90 days late'],
  ['d90plus', 'Over 90 days late'],
];

const moneyCsv = (key) => (r) => r[key];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// The GST portal's template writes dates as 20-Apr-2026.
const gstDate = (r) => {
  const d = new Date(r.date);
  return `${String(d.getDate()).padStart(2, '0')}-${MONTHS[d.getMonth()]}-${d.getFullYear()}`;
};

// Column names follow the GST portal's GSTR-1 Excel template, so the CA can
// copy the rows across.
const GST_COLUMNS = {
  b2b: [
    { key: 'gstin', label: 'GSTIN/UIN of Recipient' },
    { key: 'customer', label: 'Receiver Name' },
    { key: 'number', label: 'Invoice Number' },
    { key: 'date', label: 'Invoice date', format: 'date', csv: gstDate },
    { key: 'value', label: 'Invoice Value', format: 'money', csv: (r) => r.value },
    { key: 'placeOfSupply', label: 'Place Of Supply' },
    { key: 'reverseCharge', label: 'Reverse Charge' },
    { key: 'invoiceType', label: 'Invoice Type' },
    { key: 'rate', label: 'Rate', format: 'pct', csv: (r) => r.rate },
    { key: 'taxable', label: 'Taxable Value', format: 'money', csv: (r) => r.taxable },
    { key: 'igst', label: 'Integrated Tax', format: 'money', csv: (r) => r.igst },
    { key: 'cgst', label: 'Central Tax', format: 'money', csv: (r) => r.cgst },
    { key: 'sgst', label: 'State/UT Tax', format: 'money', csv: (r) => r.sgst },
  ],
  b2cl: [
    { key: 'number', label: 'Invoice Number' },
    { key: 'date', label: 'Invoice date', format: 'date', csv: gstDate },
    { key: 'value', label: 'Invoice Value', format: 'money', csv: (r) => r.value },
    { key: 'placeOfSupply', label: 'Place Of Supply' },
    { key: 'rate', label: 'Rate', format: 'pct', csv: (r) => r.rate },
    { key: 'taxable', label: 'Taxable Value', format: 'money', csv: (r) => r.taxable },
    { key: 'igst', label: 'Integrated Tax', format: 'money', csv: (r) => r.igst },
  ],
  b2cs: [
    { key: 'type', label: 'Type' },
    { key: 'placeOfSupply', label: 'Place Of Supply' },
    { key: 'rate', label: 'Rate', format: 'pct', csv: (r) => r.rate },
    { key: 'invoices', label: 'Invoices', format: 'int' },
    { key: 'taxable', label: 'Taxable Value', format: 'money', csv: (r) => r.taxable },
    { key: 'igst', label: 'Integrated Tax', format: 'money', csv: (r) => r.igst },
    { key: 'cgst', label: 'Central Tax', format: 'money', csv: (r) => r.cgst },
    { key: 'sgst', label: 'State/UT Tax', format: 'money', csv: (r) => r.sgst },
  ],
  hsn: [
    { key: 'hsn', label: 'HSN' },
    { key: 'description', label: 'Description' },
    { key: 'unit', label: 'UQC' },
    { key: 'quantity', label: 'Total Quantity', format: 'qty', csv: (r) => r.quantity },
    { key: 'value', label: 'Total Value', format: 'money', csv: (r) => r.value },
    { key: 'rate', label: 'Rate', format: 'pct', csv: (r) => r.rate },
    { key: 'taxable', label: 'Taxable Value', format: 'money', csv: (r) => r.taxable },
    { key: 'igst', label: 'Integrated Tax Amount', format: 'money', csv: (r) => r.igst },
    { key: 'cgst', label: 'Central Tax Amount', format: 'money', csv: (r) => r.cgst },
    { key: 'sgst', label: 'State/UT Tax Amount', format: 'money', csv: (r) => r.sgst },
  ],
};
const GST_TABS = [
  { id: 'b2b', label: 'B2B (registered buyers)', file: 'b2b' },
  { id: 'b2cl', label: 'B2C Large', file: 'b2cl' },
  { id: 'b2cs', label: 'B2C Small', file: 'b2cs' },
  { id: 'hsn', label: 'HSN summary', file: 'hsn' },
];
const GST_TOTAL_KEYS = ['value', 'taxable', 'igst', 'cgst', 'sgst', 'quantity', 'invoices'];


export function AccountsReport({ data }) {
  const [gstTab, setGstTab] = useState('b2b');
  const { kpis, gst } = data;
  const stamp = `${data.from}_to_${data.to}`;
  const monthly = data.monthly.map((m) => ({ ...m, monthLabel: fmt.month(m.month) }));
  const ageingRows = AGEING.map(([key, label]) => ({ key, label, amount: data.ageing[key] || 0 })).filter((r) => r.amount > 0);
  const gstRows = gst[gstTab];

  function downloadAllGst() {
    for (const t of GST_TABS) downloadTable(`gstr1-${t.file}_${stamp}`, GST_COLUMNS[t.id], gst[t.id]);
  }

  return (
    <div className="space-y-4">
      <KpiGrid>
        <Kpi label="Billed" value={fmt.money(kpis.billed)} delta={kpis.billedDelta} hint={`${kpis.invoices} invoice(s)`} />
        <Kpi label="Collected" value={fmt.money(kpis.collected)} delta={kpis.collectedDelta} hint={kpis.collectionRatio != null ? `${fmt.pct(kpis.collectionRatio)} of billed` : null} />
        <Kpi label="Outstanding now" value={fmt.money(kpis.outstanding)} hint={kpis.advance > 0 ? `Advance held ${fmt.money(kpis.advance)}` : 'All customers, today'} />
        <Kpi label="Overdue now" value={fmt.money(kpis.overdue)} tone={kpis.overdue > 0 ? 'bad' : 'good'} hint="Past the due date" />
        <Kpi label="GST on sales" value={fmt.money(kpis.tax)} hint={`On taxable value ${fmt.money(kpis.taxable)}`} />
        <Kpi label="Average invoice" value={fmt.money(kpis.averageInvoice)} hint={kpis.cancelledInvoices ? `${kpis.cancelledInvoices} cancelled` : null} />
        <Kpi label="Days to get paid" value={kpis.dso != null ? `${kpis.dso} days` : '—'} hint="Outstanding ÷ average daily billing (last 90 days)" />
        <Kpi label="Approved on credit hold" value={fmt.int(kpis.creditOverrides)} tone={kpis.creditOverrides ? 'bad' : undefined} hint="Orders the owner approved over the limit" />
      </KpiGrid>

      <Panel title="Billed vs collected by month">
        <GroupedBars
          data={monthly}
          labelKey="month"
          series={[
            { key: 'billed', label: 'Billed', color: BILLED },
            { key: 'collected', label: 'Collected', color: COLLECTED },
          ]}
          ariaLabel="Billed and collected money per month"
        />
      </Panel>

      <ReportTable
        title="Monthly summary"
        fileName={`sales-by-month_${stamp}`}
        columns={[
          { key: 'month', label: 'Month', format: 'month' },
          { key: 'invoices', label: 'Invoices', format: 'int' },
          { key: 'taxable', label: 'Taxable value', format: 'money', csv: moneyCsv('taxable') },
          { key: 'cgst', label: 'CGST', format: 'money', csv: moneyCsv('cgst') },
          { key: 'sgst', label: 'SGST', format: 'money', csv: moneyCsv('sgst') },
          { key: 'igst', label: 'IGST', format: 'money', csv: moneyCsv('igst') },
          { key: 'billed', label: 'Total billed', format: 'money', csv: moneyCsv('billed') },
          { key: 'collected', label: 'Collected', format: 'money', csv: moneyCsv('collected') },
        ]}
        rows={data.monthly}
        totals={totalOf(data.monthly, ['invoices', 'taxable', 'cgst', 'sgst', 'igst', 'billed', 'collected'])}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Money received by mode" hint="Receipts, order payments and advances in the period">
          <ShareBars rows={data.collectionsByMethod} labelKey="label" valueKey="amount" color={COLLECTED} />
        </Panel>
        <Panel title="How late the unpaid bills are" hint="All customers, as of today">
          <ShareBars rows={ageingRows} labelKey="label" valueKey="amount" color={BILLED} />
        </Panel>
      </div>

      <Panel
        title="GST summary for your CA (GSTR-1)"
        hint="Issued sale invoices in the period. Column names follow the GST portal's Excel template. Opening bills and cancelled invoices are left out."
        actions={<ExportButton onClick={downloadAllGst} disabled={!gst.hsn.length} label="Download all 4 sheets" />}
      >
        {gst.missingHsn ? (
          <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            {gst.missingHsn} invoice(s) have lines without an HSN code (shown as “Not set”). Set the HSN on the product or in Company details for future invoices.
          </p>
        ) : null}
        <div className="print:hidden">
          <Tabs tabs={GST_TABS.map((t) => ({ id: t.id, label: t.label, count: gst[t.id].length }))} value={gstTab} onChange={setGstTab} />
        </div>
      </Panel>
      <ReportTable
        title={GST_TABS.find((t) => t.id === gstTab).label}
        hint={gstTab === 'b2cl' ? 'Inter-state invoices over ₹1,00,000 to buyers without a GSTIN.' : gstTab === 'b2cs' ? 'Other invoices to buyers without a GSTIN, grouped by state and rate.' : null}
        fileName={`gstr1-${gstTab}_${stamp}`}
        columns={GST_COLUMNS[gstTab]}
        rows={gstRows}
        totals={gstRows.length ? totalOf(gstRows, GST_TOTAL_KEYS.filter((k) => GST_COLUMNS[gstTab].some((c) => c.key === k))) : null}
      />

      <ReportTable
        title="Who owes the most"
        hint="Every customer with money outstanding today. Days to get paid = outstanding ÷ their average daily billing over the last 90 days."
        fileName={`debtors_${data.to}`}
        columns={[
          { key: 'name', label: 'Customer', render: (r) => <Link to={`/customers/${r.id}/account`} className="font-semibold text-accent hover:underline">{r.name}</Link>, csv: (r) => r.name },
          { key: 'code', label: 'Code' },
          { key: 'outstanding', label: 'Outstanding', format: 'money', csv: moneyCsv('outstanding') },
          { key: 'overdue', label: 'Overdue', format: 'money', csv: moneyCsv('overdue') },
          { key: 'oldestOverdueDays', label: 'Oldest late', format: 'days', csv: (r) => r.oldestOverdueDays },
          { key: 'dso', label: 'Days to get paid', format: 'days', csv: (r) => r.dso ?? '' },
          { key: 'creditLimit', label: 'Credit limit', align: 'right', render: (r) => (r.creditLimit ? fmt.money(r.creditLimit) : '—'), csv: (r) => r.creditLimit || '' },
          { key: 'lastPaymentAt', label: 'Last payment', format: 'date' },
        ]}
        rows={data.debtors}
        totals={totalOf(data.debtors, ['outstanding', 'overdue'])}
        limit={20}
        empty="No customer owes anything"
      />

      <ReportTable
        title="Orders approved on credit hold"
        hint="Approved by the owner although the customer was over the limit or late paying."
        fileName={`credit-overrides_${stamp}`}
        columns={[
          { key: 'at', label: 'Approved on', format: 'date' },
          { key: 'number', label: 'Order', render: (r) => <Link to={`/sales-orders/${r.id}`} className="font-semibold text-accent hover:underline">{r.number}</Link>, csv: (r) => r.number },
          { key: 'customer', label: 'Customer' },
          { key: 'amount', label: 'Order value', format: 'money', csv: moneyCsv('amount') },
          { key: 'holdReasons', label: 'Why it was on hold', render: (r) => r.holdReasons.join('; '), csv: (r) => r.holdReasons.join('; ') },
          { key: 'reason', label: 'Owner’s reason' },
          { key: 'byName', label: 'By' },
        ]}
        rows={data.creditOverrides}
        empty="No order was approved on credit hold"
      />

      <ReportTable
        title="Invoice register"
        hint="Every sale invoice in the period. Cancelled ones are struck through and not counted in the totals."
        fileName={`invoice-register_${stamp}`}
        columns={[
          { key: 'date', label: 'Date', format: 'date' },
          { key: 'number', label: 'Invoice', render: (r) => <Link to={`/invoices/${r.id}/print`} className="font-semibold text-accent hover:underline">{r.number}</Link>, csv: (r) => r.number },
          { key: 'customer', label: 'Customer' },
          { key: 'gstin', label: 'GSTIN' },
          { key: 'orderNumber', label: 'Order' },
          { key: 'taxable', label: 'Taxable', format: 'money', csv: moneyCsv('taxable') },
          { key: 'cgst', label: 'CGST', format: 'money', csv: moneyCsv('cgst') },
          { key: 'sgst', label: 'SGST', format: 'money', csv: moneyCsv('sgst') },
          { key: 'igst', label: 'IGST', format: 'money', csv: moneyCsv('igst') },
          { key: 'total', label: 'Total', format: 'money', csv: moneyCsv('total') },
          { key: 'dueDate', label: 'Due', format: 'date' },
          { key: 'status', label: 'Status', render: (r) => (r.status === 'cancelled' ? 'Cancelled' : 'Issued'), csv: (r) => (r.status === 'cancelled' ? `Cancelled: ${r.cancelReason}` : 'Issued') },
        ]}
        rows={data.invoiceRegister.map((r) => ({ ...r, muted: r.status === 'cancelled' }))}
        totals={totalOf(data.invoiceRegister.filter((r) => r.status === 'issued'), ['taxable', 'cgst', 'sgst', 'igst', 'total'])}
      />

      <ReportTable
        title="Receipt register"
        hint="All money received in the period: on the customer account, on orders, and order advances."
        fileName={`receipt-register_${stamp}`}
        columns={[
          { key: 'date', label: 'Date', format: 'date' },
          { key: 'number', label: 'Receipt / order' },
          { key: 'source', label: 'Recorded as' },
          { key: 'customer', label: 'Customer', render: (r) => (r.customerId ? <Link to={`/customers/${r.customerId}/account`} className="text-accent hover:underline">{r.customer}</Link> : r.customer), csv: (r) => r.customer },
          { key: 'methodLabel', label: 'Mode' },
          { key: 'reference', label: 'Reference' },
          { key: 'amount', label: 'Amount', format: 'money', csv: moneyCsv('amount') },
        ]}
        rows={data.receiptRegister}
        totals={totalOf(data.receiptRegister, ['amount'])}
      />
    </div>
  );
}
