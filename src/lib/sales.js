export const SALES_ORDER_VIEW_KEYS = [
  'sales:read',
  'production:read',
  'inventory:read',
  'accounts:read',
];

export const ANALYTICS_VIEW_KEYS = ['production:read'];

export const PRODUCTION_ROUTES = [
  { id: 'roll_dispatch', label: 'Rolling → Dispatch → Delivery', stages: ['rolling', 'dispatch', 'delivery'] },
  { id: 'roll_print_dispatch', label: 'Rolling → Printing → Dispatch → Delivery', stages: ['rolling', 'printing', 'dispatch', 'delivery'] },
  { id: 'roll_print_cut_dispatch', label: 'Rolling → Printing → Cutting → Dispatch → Delivery', stages: ['rolling', 'printing', 'cutting', 'dispatch', 'delivery'] },
  { id: 'roll_cut_dispatch', label: 'Rolling → Cutting → Dispatch → Delivery', stages: ['rolling', 'cutting', 'dispatch', 'delivery'] },
];

export const PRODUCTION_STAGES = [
  { id: 'rolling', label: 'Rolling', read: 'production:rolling:read', update: 'production:rolling:update' },
  { id: 'printing', label: 'Printing', read: 'production:printing:read', update: 'production:printing:update' },
  { id: 'cutting', label: 'Cutting', read: 'production:cutting:read', update: 'production:cutting:update' },
  { id: 'dispatch', label: 'Dispatch', read: 'dispatch:read', update: 'dispatch:update' },
  { id: 'delivery', label: 'Delivery', read: 'dispatch:read', update: 'dispatch:update' },
];

export const PRODUCTION_SHIFTS = [
  { id: 'morning', label: 'Morning' },
  { id: 'afternoon', label: 'Afternoon' },
  { id: 'night', label: 'Night' },
];

export const DELIVERY_PARTNERS = ['In-house', 'Delhivery', 'Customer'];

export const PRODUCTION_VIEW_KEYS = [
  'production:read',
  'production:rolling:read',
  'production:printing:read',
  'production:cutting:read',
  'dispatch:read',
];

export const STATUS_LABELS = {
  draft: 'Draft',
  submitted: 'Submitted',
  approved: 'Approved',
  production_planned: 'Production planned',
  in_production: 'In production',
  ready_for_packing: 'Ready for packing',
  packed: 'Packed',
  ready_for_dispatch: 'Ready for dispatch',
  dispatched: 'Dispatched',
  delivered: 'Delivered',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const PRIORITIES = [
  { id: 'normal', label: 'Normal' },
  { id: 'high', label: 'High' },
  { id: 'urgent', label: 'Urgent' },
];

export const PAYMENT_TERMS = [
  { id: 'advance', label: 'Advance' },
  { id: 'credit', label: 'Credit' },
  { id: 'cod', label: 'COD' },
  { id: 'custom', label: 'Custom' },
];

export const PAYMENT_METHODS = [
  { id: 'cash', label: 'Cash' },
  { id: 'bank_transfer', label: 'Bank transfer' },
  { id: 'cheque', label: 'Cheque' },
  { id: 'upi', label: 'UPI' },
  { id: 'other', label: 'Other' },
];

export const ATTACHMENT_KINDS = [
  { id: 'po', label: 'Customer PO' },
  { id: 'artwork', label: 'Artwork / design' },
  { id: 'spec', label: 'Specification' },
  { id: 'image', label: 'Image' },
  { id: 'pdf', label: 'PDF' },
  { id: 'other', label: 'Other' },
];

export const STEP_LABELS = {
  approved: 'Order approved',
  planned: 'Production planned',
  rolling: 'Rolling',
  printing: 'Printing',
  cutting: 'Cutting',
  packing: 'Packing',
  dispatch: 'Dispatch',
  delivery: 'Delivery',
};

export const NEXT_STATUS_LABELS = { ...STATUS_LABELS };

export const OPTION_GROUPS = [
  { id: 'productType', label: 'Product type', hint: 'Bag, roll, finished product' },
  { id: 'material', label: 'Material', hint: 'HDPE, LDPE, PP' },
  { id: 'unit', label: 'Unit', hint: 'pcs, kg, roll' },
  { id: 'color', label: 'Color', hint: 'Red, black, green, golden' },
  { id: 'thickness', label: 'Thickness', hint: '40 micron, 50 micron' },
  { id: 'size', label: 'Size', hint: '20 × 30 inch' },
  { id: 'width', label: 'Width', hint: '20 inch, 500 mm' },
  { id: 'length', label: 'Length', hint: '30 inch, 800 m' },
  { id: 'rawMaterial', label: 'Raw material', hint: 'HDPE granules' },
  { id: 'materialType', label: 'Material type', hint: 'LD - Plain, LD - BST' },
  { id: 'materialGrade', label: 'Material grade', hint: 'Film grade' },
  { id: 'additive', label: 'Additives', hint: 'UV stabilizer, EVA' },
  { id: 'specialRequirement', label: 'Special requirements', hint: 'Half Punch, as per sample' },
  { id: 'holeType', label: 'Hole type', hint: 'Punch, Butterfly' },
  { id: 'holeCount', label: 'No. of holes', hint: '1 to 6' },
  { id: 'holeSize', label: 'Hole size', hint: '8 mm' },
  { id: 'holePosition', label: 'Hole position', hint: 'Top centre' },
  { id: 'tapeType', label: 'Tape type', hint: '11mm Tape, PP line tape' },
  { id: 'printImpression', label: 'Print impression', hint: '0+1, 1+1, 2+2' },
  { id: 'printColor', label: 'Print colours', hint: 'Red, Black, Golden' },
  { id: 'printDesign', label: 'Print design', hint: 'Customer logo' },
];

export const OPTION_LIST_SECTIONS = [
  { id: 'product', label: 'Product', groups: ['productType', 'material', 'unit'] },
  { id: 'size', label: 'Size & colour', groups: ['size', 'width', 'length', 'thickness', 'color'] },
  { id: 'factory', label: 'Rolling', groups: ['rawMaterial', 'materialType', 'materialGrade', 'additive', 'specialRequirement'] },
  { id: 'print', label: 'Printing', groups: ['printImpression', 'printColor', 'printDesign'] },
  { id: 'finish', label: 'Cutting / holes & tape', groups: ['holeType', 'holeCount', 'holeSize', 'holePosition', 'tapeType'] },
];

export function canViewSalesOrders(can) {
  return SALES_ORDER_VIEW_KEYS.some((key) => can(key));
}

export function canViewAnalytics(can) {
  return ANALYTICS_VIEW_KEYS.some((key) => can(key));
}

export function canSeeCommercial(can) {
  return can('sales:read') || can('accounts:read');
}

export function routeHasPrint(route) {
  return String(route || '').includes('print');
}

export function routeHasCut(route) {
  return String(route || '').includes('cut');
}

export function routeStages(route) {
  return PRODUCTION_ROUTES.find((item) => item.id === route)?.stages || ['rolling', 'dispatch', 'delivery'];
}

export function applyRoute(item, route) {
  return {
    ...item,
    productionRoute: route,
    printing: { ...item.printing, required: routeHasPrint(route) },
  };
}

export function routeLabel(id) {
  return PRODUCTION_ROUTES.find((route) => route.id === id)?.label || id || '—';
}

export function statusLabel(id) {
  return STATUS_LABELS[id] || id || '—';
}

export const FLOOR_STATUSES = ['production_planned', 'in_production', 'ready_for_dispatch', 'dispatched'];

export function isFloorStatus(status) {
  return FLOOR_STATUSES.includes(status);
}

export function stageLabel(id) {
  return PRODUCTION_STAGES.find((stage) => stage.id === id)?.label || STEP_LABELS[id] || id || '—';
}

function qty(value) {
  return Number(value) || 0;
}

export function formatQty(value) {
  return qty(value).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

export function itemStageStats(item, stage) {
  const work = (item.stageWork || []).filter((row) => row.stage === stage);
  const input = work.reduce((sum, row) => sum + qty(row.inputQty), 0);
  const output = work.reduce((sum, row) => sum + qty(row.outputQty), 0);
  const waste = work.reduce((sum, row) => sum + qty(row.wasteQty), 0);
  const target = qty(item.quantity);
  return {
    input,
    output,
    waste,
    target,
    remaining: Math.max(0, target - output),
    done: target > 0 ? output >= target : output > 0,
  };
}

export function orderActiveStages(order) {
  const seen = [];
  for (const item of order.items || []) {
    const stages = routeStages(item.productionRoute);
    const current = stages.find((stage) => !itemStageStats(item, stage).done) || '';
    if (current && !seen.includes(current)) seen.push(current);
  }
  return PRODUCTION_STAGES.map((stage) => stage.id).filter((id) => seen.includes(id));
}

export function orderStageSummary(order) {
  const involved = new Set();
  for (const item of order.items || []) {
    for (const stage of routeStages(item.productionRoute)) involved.add(stage);
  }
  const active = new Set(orderActiveStages(order));

  return PRODUCTION_STAGES.filter((stage) => involved.has(stage.id)).map((meta) => {
    const lines = (order.items || [])
      .filter((item) => routeStages(item.productionRoute).includes(meta.id))
      .map((item) => {
        const stats = itemStageStats(item, meta.id);
        const nowAt = routeStages(item.productionRoute).find((stage) => !itemStageStats(item, stage).done);
        return {
          id: item.id,
          product: item.product,
          productCode: item.productCode,
          unit: item.unit || 'pcs',
          route: item.productionRoute,
          current: nowAt === meta.id,
          ...stats,
        };
      });
    const totals = lines.reduce(
      (acc, line) => ({
        target: acc.target + line.target,
        input: acc.input + line.input,
        output: acc.output + line.output,
        waste: acc.waste + line.waste,
        remaining: acc.remaining + line.remaining,
      }),
      { target: 0, input: 0, output: 0, waste: 0, remaining: 0 }
    );
    return {
      id: meta.id,
      label: meta.label,
      active: active.has(meta.id),
      done: lines.length > 0 && lines.every((line) => line.done),
      lines,
      ...totals,
    };
  });
}

export function formatMoney(value) {
  if (value == null || value === '') return '—';
  return `₹${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function toDateInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function emptyManufacturing() {
  return {
    rawMaterial: '',
    materialType: '',
    materialGrade: '',
    requiredWeight: '',
    requiredQuantity: '',
    width: '',
    length: '',
    thickness: '',
    color: '',
    additives: '',
    specialRequirements: '',
  };
}

export function emptyLineItem() {
  return {
    templateId: '',
    product: '',
    productCode: '',
    productType: 'Finished Product',
    size: '',
    material: '',
    thickness: '',
    width: '',
    length: '',
    color: '',
    quantity: '',
    unit: 'pcs',
    rate: '',
    discount: '0',
    taxPercent: '18',
    productionRoute: 'roll_print_cut_dispatch',
    manufacturing: emptyManufacturing(),
    roll: { width: '', length: '', weight: '', size: '' },
    bag: { width: '', length: '', gusset: '', size: '' },
    printing: {
      required: true,
      artwork: '',
      impressions: '',
      colorCount: '',
      colors: '',
      design: '',
      requirement: '',
      specialRequirements: '',
    },
    holes: { required: false, count: '', type: '', size: '', position: '', specialRequirements: '' },
    tape: { required: false, type: '' },
    image: { originalName: '', mimeType: '', dataUrl: '', url: '', key: '', storage: '' },
  };
}

export function itemFromApi(item) {
  const base = emptyLineItem();
  return {
    ...base,
    id: item.id,
    templateId: item.templateId || '',
    product: item.product || '',
    productCode: item.productCode || '',
    productType: item.productType || '',
    size: item.size || '',
    material: item.material || '',
    thickness: item.thickness || '',
    width: item.width || '',
    length: item.length || '',
    color: item.color || '',
    quantity: item.quantity == null ? '' : String(item.quantity),
    unit: item.unit || 'pcs',
    rate: item.rate == null ? '' : String(item.rate),
    discount: item.discount == null ? '0' : String(item.discount),
    taxPercent: item.taxPercent == null ? '18' : String(item.taxPercent),
    productionRoute: item.productionRoute || base.productionRoute,
    manufacturing: { ...base.manufacturing, ...(item.manufacturing || {}) },
    roll: { ...base.roll, ...(item.roll || {}) },
    bag: { ...base.bag, ...(item.bag || {}) },
    printing: { ...base.printing, ...(item.printing || {}) },
    holes: { ...base.holes, ...(item.holes || {}) },
    tape: { ...base.tape, ...(item.tape || {}) },
    image: { ...base.image, ...(item.image || {}) },
  };
}

export function applyTemplate(item, template) {
  const next = itemFromApi(template);
  return {
    ...next,
    id: item.id,
    templateId: template.id,
    quantity: item.quantity || next.quantity,
    discount: item.discount || '0',
  };
}

export function itemToPayload(item) {
  return {
    id: item.id,
    product: item.product,
    productCode: item.productCode,
    productType: item.productType,
    size: item.size,
    material: item.material,
    thickness: item.thickness,
    width: item.width,
    length: item.length,
    color: item.color,
    quantity: Number(item.quantity) || 0,
    unit: item.unit,
    rate: Number(item.rate) || 0,
    discount: Number(item.discount) || 0,
    taxPercent: Number(item.taxPercent) || 0,
    productionRoute: item.productionRoute,
    manufacturing: item.manufacturing,
    roll: item.roll,
    bag: item.bag,
    printing: {
      ...item.printing,
      required: routeHasPrint(item.productionRoute) || Boolean(item.printing?.required),
    },
    holes: { ...item.holes, required: Boolean(item.holes?.required) },
    tape: { ...item.tape, required: Boolean(item.tape?.required) },
    image: {
      originalName: item.image?.originalName || '',
      mimeType: item.image?.mimeType || '',
      dataUrl: item.image?.url ? '' : item.image?.dataUrl || '',
      url: item.image?.url || '',
      key: item.image?.key || '',
      storage: item.image?.storage || '',
    },
  };
}

function money(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

export function calcLine(item) {
  const quantity = Number(item.quantity) || 0;
  const rate = Number(item.rate) || 0;
  const discount = Number(item.discount) || 0;
  const taxPercent = Number(item.taxPercent) || 0;
  const taxable = Math.max(0, quantity * rate - discount);
  const tax = (taxable * taxPercent) / 100;
  return { taxable: money(taxable), tax: money(tax), amount: money(taxable) };
}

export function calcOrder(items, orderDiscount, advanceAmount) {
  let subtotal = 0;
  let tax = 0;
  for (const item of items) {
    const line = calcLine(item);
    subtotal += line.taxable;
    tax += line.tax;
  }
  const discount = Math.max(0, Number(orderDiscount) || 0);
  const grandTotal = Math.max(0, subtotal - discount + tax);
  const remaining = Math.max(0, grandTotal - Math.max(0, Number(advanceAmount) || 0));
  return {
    subtotal: money(subtotal),
    discount: money(discount),
    tax: money(tax),
    grandTotal: money(grandTotal),
    remaining: money(remaining),
  };
}

export function setPath(target, path, value) {
  const parts = path.split('.');
  if (parts.length === 1) return { ...target, [path]: value };
  const [head, ...rest] = parts;
  return { ...target, [head]: setPath(target[head] || {}, rest.join('.'), value) };
}
