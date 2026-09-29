export const STAGE_COLUMNS = {
  rolling: [
    { key: 'orderNumber', label: 'Sales order' },
    { key: 'product', label: 'Name' },
    { key: 'productCode', label: 'Code' },
    { key: 'customerName', label: 'Party name' },
    { key: 'beam', label: 'Beam', edit: true },
    { key: 'rollSize', label: 'Roll size' },
    { key: 'tb', label: 'T×B mm', edit: true },
    { key: 'rollType', label: 'Roll type', edit: true, choices: ['Side seal', 'Centre fold'] },
    { key: 'materialType', label: 'Type' },
    { key: 'tubeMedium', label: 'Tube (medium)', edit: true, choices: ['Paper'] },
    { key: 'tubeCore', label: 'Tube (core)', edit: true, choices: ['3 inch'] },
    { key: 'tubeParticular', label: 'Tube (particular)', edit: true, choices: ['Plain'] },
    { key: 'sheetTube', label: 'Sheet / tube (8 mm)', edit: true, choices: ['Sheet (8 mm)', 'Tube (8 mm)'] },
    { key: 'recycled', label: 'Recycled (5–10)', edit: true, choices: ['5', '6', '7', '8', '9', '10'] },
    { key: 'exStock', label: 'Ex-stock (D.S.)', edit: true, choices: ['D.S.'] },
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
    { key: 'uv', label: 'UV', edit: true, choices: ['Yes', 'No'] },
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
    { key: 'rollType', label: 'Roll type', edit: true, choices: ['Side seal', 'Centre fold'] },
    { key: 'cuts', label: 'No. of cuts', edit: true },
    { key: 'discKnife', label: 'Disc / knife', edit: true, choices: ['disc', 'knife'] },
  ],
};

const FROZEN = {
  no: { width: 3, sticky: 'sticky' },
  date: { width: 7.5, sticky: 'sm:sticky' },
  orderNumber: { width: 9, sticky: 'sm:sticky' },
  product: { width: 11, sticky: 'lg:sticky' },
  productCode: { width: 6.5, sticky: 'lg:sticky' },
  customerName: { width: 11, sticky: 'lg:sticky' },
};

export function frozenColumns(columns) {
  const keys = ['no', 'date'];
  for (const column of columns || []) {
    if (!FROZEN[column.key]) break;
    keys.push(column.key);
  }
  const layout = {};
  let left = 0;
  keys.forEach((key, index) => {
    const { width, sticky } = FROZEN[key];
    const edge = index === keys.length - 1 ? 'shadow-[inset_-2px_0_0_#a8a29e]' : '';
    layout[key] = {
      className: `${sticky} z-10 overflow-hidden text-ellipsis ${edge}`,
      style: { left: `${left}rem`, width: `${width}rem`, minWidth: `${width}rem`, maxWidth: `${width}rem` },
    };
    left += width;
  });
  return layout;
}

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
  if (key === 'sheetTube') {
    if (entry.details?.sheetTube) return entry.details.sheetTube;
    if (entry.details?.sheet8) return 'Sheet (8 mm)';
    if (entry.details?.tube8) return 'Tube (8 mm)';
  }
  if (key === 'discKnife') {
    if (entry.details?.discKnife) return entry.details.discKnife;
    return [entry.details?.disc, entry.details?.knife].filter(Boolean).join(' · ');
  }
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
