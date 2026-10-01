const ROLLING_ROLL_TYPES = [
  'Tube (Maticore)',
  'Tube (Medium)',
  'Cake',
  'Tube (Patli Cap)',
  'Sheet (Sana)',
  'Recycled (5/60?)',
  'Frosted',
  'B Tube',
  'Barni',
  'Milk',
];

export const STAGE_COLUMNS = {
  rolling: [
    { key: 'orderNumber', label: 'Order' },
    { key: 'product', label: 'Name' },
    { key: 'productCode', label: 'Code' },
    { key: 'customerCode', label: 'Customer code' },
    { key: 'rollSize', label: 'Roll size' },
    { key: 'rollType', label: 'Roll type', edit: true, choices: ROLLING_ROLL_TYPES },
    { key: 'exStock', label: 'Ex-stock (D.S.)', edit: true, choices: ['D.S.'] },
    { key: 'colour', label: 'Colour' },
    { key: 'weight', label: 'Weight', edit: true },
    { key: 'gross', label: 'Gross', edit: true },
    { key: 'tare', label: 'Tare', edit: true },
    { key: 'net', label: 'Net', edit: true },
    { key: 'description', label: 'Description', edit: true, long: true },
  ],
  printing: [
    { key: 'orderNumber', label: 'Order' },
    { key: 'product', label: 'Name' },
    { key: 'productCode', label: 'code' },
    { key: 'customerCode', label: 'Customer code' },
    { key: 'rollSize', label: 'Roll size' },
    { key: 'jobSize', label: 'Job size' },
    { key: 'quantity', label: 'Quantity', edit: true, qty: 'output' },
    { key: 'impression', label: 'impression' },
    { key: 'colorUsed', label: 'color used' },
    { key: 'cylinderSize', label: 'Cylinder size', edit: true },
    { key: 'wastage', label: 'wastage', edit: true, qty: 'waste' },
    { key: 'printDescription', label: 'Print description', edit: true, long: true },
  ],
  cutting: [
    { key: 'orderNumber', label: 'Order' },
    { key: 'product', label: 'Name' },
    { key: 'customerCode', label: 'Customer code' },
    { key: 'rollSize', label: 'Roll size' },
    { key: 'size', label: 'Size' },
    { key: 'quantity', label: 'Quantity', edit: true, qty: 'output' },
    { key: 'tubeUsed', label: 'Tape used', edit: true },
    { key: 'hole', label: 'Hole' },
    { key: 'rollType', label: 'Hole type', edit: true },
    { key: 'cuts', label: 'No. of cuts', edit: true },
    { key: 'discKnife', label: 'Disc / knife', edit: true, choices: ['disc', 'knife'] },
    { key: 'description', label: 'Description', edit: true, long: true },
  ],
};

export function isSuperAdmin(user) {
  return user?.role?.slug === 'super_admin';
}

export function bookColumns(stage, showCustomerName) {
  const columns = STAGE_COLUMNS[stage];
  if (!columns || !showCustomerName) return columns || null;
  const at = columns.findIndex((column) => column.key === 'customerCode');
  if (at < 0) return columns;
  return [...columns.slice(0, at + 1), { key: 'customerName', label: 'Customer name' }, ...columns.slice(at + 1)];
}

const FROZEN = {
  no: { width: 3, sticky: 'sticky' },
  date: { width: 7.5, sticky: 'sm:sticky' },
  orderNumber: { width: 9, sticky: 'sm:sticky' },
  product: { width: 11, sticky: 'lg:sticky' },
  productCode: { width: 6.5, sticky: 'lg:sticky' },
  customerCode: { width: 7.5, sticky: 'lg:sticky' },
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
  if (key === 'customerCode') return line.customerCode || '';
  const spec = line.specs?.[key];
  return spec == null ? '' : String(spec);
}

export function savedValue(entry, key, customerName = '') {
  if (!entry) return '';
  if (key === 'orderNumber') return entry.orderNumber || '';
  if (key === 'product') return entry.product || '';
  if (key === 'productCode') return entry.productCode || '';
  if (key === 'customerName' || key === 'party') return entry.customerName || customerName || '';
  if (key === 'customerCode') return entry.customerCode || '';
  if (key === 'quantity') return entry.outputQty ? String(entry.outputQty) : '';
  if (key === 'wastage') return entry.details?.wastage || (entry.wasteQty ? String(entry.wasteQty) : '');
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
