export const STAGE_COLUMNS = {
  rolling: [
    { key: 'orderNumber', label: 'Sales order' },
    { key: 'product', label: 'Name' },
    { key: 'productCode', label: 'Code' },
    { key: 'customerName', label: 'Party name' },
    { key: 'beam', label: 'Beam', edit: true },
    { key: 'rollSize', label: 'Roll size' },
    { key: 'tb', label: 'T×B mm', edit: true },
    { key: 'rollType', label: 'Roll type', edit: true },
    { key: 'materialType', label: 'Type' },
    { key: 'tubeMedium', label: 'Tube (medium)', edit: true },
    { key: 'tubeCore', label: 'Tube (core)', edit: true },
    { key: 'tubeParticular', label: 'Tube (particular)', edit: true },
    { key: 'sheet8', label: 'Sheet (8 mm)', edit: true },
    { key: 'tube8', label: 'Tube (8 mm)', edit: true },
    { key: 'recycled', label: 'Recycled (5–10)', edit: true },
    { key: 'exStock', label: 'Ex-stock (D.S.)', edit: true },
    { key: 'micron', label: 'Micron' },
    { key: 'colour', label: 'Colour' },
    { key: 'width', label: 'Width' },
    { key: 'weight', label: 'Weight', edit: true },
    { key: 'gross', label: 'Gross', edit: true },
    { key: 'tare', label: 'Tare', edit: true },
    { key: 'net', label: 'Net', edit: true },
    { key: 'party', label: 'Party' },
  ],
  printing: [
    { key: 'orderNumber', label: 'S/o' },
    { key: 'product', label: 'Name' },
    { key: 'productCode', label: 'code' },
    { key: 'customerName', label: 'Customer name' },
    { key: 'rollSize', label: 'Roll size' },
    { key: 'jobSize', label: 'Job size' },
    { key: 'quantity', label: 'Quantity', edit: true, qty: 'output' },
    { key: 'impression', label: 'impression' },
    { key: 'colorUsed', label: 'color used' },
    { key: 'cylinderSize', label: 'Cylinder size', edit: true },
    { key: 'wastage', label: 'wastage', edit: true, qty: 'waste' },
    { key: 'gauge', label: 'gauge', edit: true },
    { key: 'uv', label: 'UV', edit: true },
    { key: 'printDescription', label: 'Print description', edit: true },
  ],
  cutting: [
    { key: 'orderNumber', label: 'S/o' },
    { key: 'product', label: 'Name' },
    { key: 'customerName', label: 'Customer name' },
    { key: 'rollSize', label: 'Roll size' },
    { key: 'size', label: 'Size' },
    { key: 'quantity', label: 'Quantity', edit: true, qty: 'output' },
    { key: 'tubeUsed', label: 'Tube used', edit: true },
    { key: 'hole', label: 'Hole' },
    { key: 'rollType', label: 'Roll type', edit: true },
    { key: 'cuts', label: 'No. of cuts', edit: true },
    { key: 'disc', label: 'disc', edit: true },
    { key: 'knife', label: 'knife', edit: true },
  ],
};

export const OPERATOR_LABEL = {
  rolling: 'person',
  printing: 'Name',
  cutting: 'person',
};

export function paperQuantities(stage, details) {
  const fields = details || {};
  if (stage === 'printing' || stage === 'cutting') {
    const wasteText = String(fields.wastage ?? '').trim();
    const waste = Number(wasteText);
    const wasteOk = stage !== 'printing' || wasteText === '' || (Number.isFinite(waste) && waste >= 0);
    return {
      outputQty: Number(fields.quantity),
      wasteQty: stage === 'printing' && wasteOk ? waste || 0 : 0,
      wasteOk,
    };
  }
  const netText = String(fields.net ?? '').trim();
  const weightText = String(fields.weight ?? '').trim();
  const net = Number(netText);
  const weight = Number(weightText);
  const outputQty = netText !== '' && Number.isFinite(net) ? net : weight;
  return { outputQty, wasteQty: 0 };
}

export function orderValue(line, key) {
  if (!line) return '';
  if (key === 'orderNumber') return line.orderNumber || '';
  if (key === 'product') return line.product || '';
  if (key === 'productCode') return line.productCode || '';
  if (key === 'customerName' || key === 'party') return line.customerName || '';
  const spec = line.specs?.[key];
  return spec == null ? '' : String(spec);
}

export function savedValue(entry, key, customerName = '') {
  if (!entry) return '';
  if (key === 'orderNumber') return entry.orderNumber || '';
  if (key === 'product') return entry.product || '';
  if (key === 'productCode') return entry.productCode || '';
  if (key === 'customerName' || key === 'party') return entry.customerName || customerName || '';
  if (key === 'quantity') return entry.outputQty ? String(entry.outputQty) : '';
  if (key === 'wastage') return entry.details?.wastage || (entry.wasteQty ? String(entry.wasteQty) : '');
  return entry.details?.[key] || '';
}

export function typedDetails(stage, details) {
  const columns = STAGE_COLUMNS[stage] || [];
  const out = {};
  for (const column of columns) {
    if (!column.edit || column.qty === 'output') continue;
    const value = String(details?.[column.key] ?? '').trim();
    if (value) out[column.key] = value;
  }
  return out;
}
