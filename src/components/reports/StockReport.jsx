import { fmt, totalOf } from '../../lib/reports';
import { Kpi, KpiGrid, Panel, ReportTable, ShareBars } from './ReportKit';

const RAW = '#2a78d6';
const money = (key) => (r) => r[key] ?? '';
const qtyCell = (r) => `${fmt.qty(r.quantity)} ${r.unit}`;

export function StockReport({ data }) {
  const { kpis } = data;
  const stamp = `${data.from}_to_${data.to}`;
  const valued = data.categories.filter((c) => c.value > 0);

  return (
    <div className="space-y-4">
      <KpiGrid>
        <Kpi label="Stock value now" value={fmt.money(kpis.totalValue)} hint={kpis.unpriced ? `${kpis.unpriced} lot(s) have no price, so are not counted` : 'Quantity × unit price'} />
        <Kpi label="Raw material" value={fmt.money(kpis.rawValue)} />
        <Kpi label="Finished goods" value={fmt.money(kpis.outputValue)} />
        <Kpi label="Waste in store" value={kpis.wasteText || '—'} />
        <Kpi label="Lots in stock" value={fmt.int(kpis.lotsInStock)} hint={kpis.wipLots ? `${kpis.wipLots} part-made (WIP)` : null} />
        <Kpi label="Not moved 30+ days" value={fmt.int(kpis.slowLots)} tone={kpis.slowLots ? 'bad' : 'good'} hint={kpis.slowValue ? `Worth ${fmt.money(kpis.slowValue)}` : null} />
        <Kpi label="Raw lots added" value={fmt.int(kpis.addedLots)} hint="In the period" />
        <Kpi label="Material used at rolling" value={`${fmt.qty(kpis.materialUsedKg)} kg`} hint="In the period" />
      </KpiGrid>

      <div className="grid gap-4 lg:grid-cols-2">
        <ReportTable
          title="Stock by category"
          fileName={`stock-by-category_${data.to}`}
          columns={[
            { key: 'label', label: 'Category' },
            { key: 'lots', label: 'Lots', format: 'int' },
            { key: 'quantityText', label: 'Quantity' },
            { key: 'value', label: 'Value', format: 'money', csv: money('value') },
            { key: 'unpriced', label: 'Lots without price', format: 'int' },
          ]}
          rows={data.categories}
          totals={totalOf(data.categories, ['lots', 'value'])}
        />
        <Panel title="Where the stock value is">
          <ShareBars rows={valued} labelKey="label" valueKey="value" color={RAW} />
        </Panel>
      </div>

      <ReportTable
        title="Stock lots now"
        hint="Every lot with stock. Value = quantity × unit price (waste has no value)."
        fileName={`stock-lots_${data.to}`}
        columns={[
          { key: 'name', label: 'Lot / material' },
          { key: 'categoryLabel', label: 'Category' },
          { key: 'materialType', label: 'Type' },
          { key: 'stage', label: 'Stage' },
          { key: 'supplier', label: 'Supplier' },
          { key: 'quantity', label: 'Quantity', render: qtyCell, csv: (r) => r.quantity },
          { key: 'unit', label: 'Unit', csvOnly: true },
          { key: 'unitPrice', label: 'Unit price', format: 'money', csv: money('unitPrice') },
          { key: 'value', label: 'Value', format: 'money', csv: money('value') },
          { key: 'changedAt', label: 'Last changed', format: 'date' },
        ]}
        rows={data.lots}
        totals={totalOf(data.lots, ['value'])}
        limit={25}
        empty="No stock"
      />

      <ReportTable
        title="Not moved for 30 days or more"
        hint="Lots whose quantity has not changed in a month or more, most valuable first. Use them or sell them."
        fileName={`slow-stock_${data.to}`}
        columns={[
          { key: 'name', label: 'Lot / material' },
          { key: 'categoryLabel', label: 'Category' },
          { key: 'quantity', label: 'Quantity', render: qtyCell, csv: (r) => r.quantity },
          { key: 'unit', label: 'Unit', csvOnly: true },
          { key: 'value', label: 'Value', format: 'money', csv: money('value') },
          { key: 'idleDays', label: 'Days unchanged', format: 'int' },
          { key: 'bucket', label: 'Group' },
        ]}
        rows={data.slow}
        totals={totalOf(data.slow, ['value'])}
        limit={25}
        empty="Every lot has moved in the last 30 days"
      />

      <ReportTable
        title="Material used at rolling"
        hint="From the rolling entries in the period (kg)."
        fileName={`material-used_${stamp}`}
        columns={[
          { key: 'material', label: 'Material' },
          { key: 'entries', label: 'Entries', format: 'int' },
          { key: 'input', label: 'Used (kg)', format: 'qty' },
          { key: 'output', label: 'Made (kg)', format: 'qty' },
          { key: 'waste', label: 'Waste (kg)', format: 'qty' },
          { key: 'wastePct', label: 'Waste %', format: 'pct', csv: (r) => r.wastePct ?? '' },
        ]}
        rows={data.materialUse}
        totals={totalOf(data.materialUse, ['entries', 'input', 'output', 'waste'])}
        empty="No rolling entries in this period"
      />

      <ReportTable
        title="Raw material lots added, by supplier"
        hint="Lots created in the period, with what is left of them today (the original received quantity is not kept)."
        fileName={`raw-lots-by-supplier_${stamp}`}
        columns={[
          { key: 'supplier', label: 'Supplier' },
          { key: 'lots', label: 'Lots', format: 'int' },
          { key: 'materials', label: 'Materials' },
          { key: 'quantityText', label: 'Left today' },
          { key: 'value', label: 'Value left', format: 'money', csv: money('value') },
        ]}
        rows={data.bySupplier}
        totals={totalOf(data.bySupplier, ['lots', 'value'])}
        empty="No raw material lots were added in this period"
      />

      {data.wip.length ? (
        <ReportTable
          title="Part-made stock (WIP) waiting between stages"
          fileName={`wip-lots_${data.to}`}
          columns={[
            { key: 'name', label: 'Lot' },
            { key: 'stage', label: 'Stage' },
            { key: 'quantity', label: 'Quantity', render: qtyCell, csv: (r) => r.quantity },
            { key: 'unit', label: 'Unit', csvOnly: true },
            { key: 'idleDays', label: 'Days unchanged', format: 'int' },
          ]}
          rows={data.wip}
        />
      ) : null}
    </div>
  );
}
