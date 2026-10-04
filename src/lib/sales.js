export const SALES_ORDER_VIEW_KEYS = [
  'sales:read',
  'production:read',
  'inventory:read',
  'accounts:read',
  'dispatch:read',
];

export const ANALYTICS_VIEW_KEYS = ['production:read'];

export const PRODUCTION_ROUTES = [
  { id: 'roll_dispatch', label: 'Rolling → Dispatch', stages: ['rolling', 'dispatch'], orderType: 'sales_order' },
  { id: 'roll_print_dispatch', label: 'Rolling → Printing → Dispatch', stages: ['rolling', 'printing', 'dispatch'], orderType: 'sales_order' },
  { id: 'roll_print_cut_dispatch', label: 'Rolling → Printing → Cutting → Dispatch', stages: ['rolling', 'printing', 'cutting', 'dispatch'], orderType: 'sales_order' },
  { id: 'roll_cut_dispatch', label: 'Rolling → Cutting → Dispatch', stages: ['rolling', 'cutting', 'dispatch'], orderType: 'sales_order' },
  { id: 'print_dispatch', label: 'Printing → Dispatch', stages: ['printing', 'dispatch'], orderType: 'job_work' },
  { id: 'print_cut_dispatch', label: 'Printing → Cutting → Dispatch', stages: ['printing', 'cutting', 'dispatch'], orderType: 'job_work' },
  { id: 'cut_dispatch', label: 'Cutting → Dispatch', stages: ['cutting', 'dispatch'], orderType: 'job_work' },
];

const ROUTE_SWAP = {
  job_work: {
    roll_dispatch: 'print_dispatch',
    roll_print_dispatch: 'print_dispatch',
    roll_print_cut_dispatch: 'print_cut_dispatch',
    roll_cut_dispatch: 'cut_dispatch',
  },
  sales_order: {
    print_dispatch: 'roll_print_dispatch',
    print_cut_dispatch: 'roll_print_cut_dispatch',
    cut_dispatch: 'roll_cut_dispatch',
  },
};

export function routesFor(orderType) {
  const type = orderType === 'job_work' ? 'job_work' : 'sales_order';
  return PRODUCTION_ROUTES.filter((route) => route.orderType === type);
}

export function fitRoute(item, orderType) {
  const allowed = routesFor(orderType);
  if (allowed.some((route) => route.id === item.productionRoute)) return item;
  const type = orderType === 'job_work' ? 'job_work' : 'sales_order';
  return applyRoute(item, ROUTE_SWAP[type][item.productionRoute] || allowed[0].id);
}

export const PRODUCTION_STAGES = [
  { id: 'rolling', label: 'Rolling', read: 'production:rolling:read', update: 'production:rolling:update' },
  { id: 'printing', label: 'Printing', read: 'production:printing:read', update: 'production:printing:update' },
  { id: 'cutting', label: 'Cutting', read: 'production:cutting:read', update: 'production:cutting:update' },
  { id: 'dispatch', label: 'Dispatch', read: 'dispatch:read', update: 'dispatch:update' },
];

export const DELIVERY_PARTNERS = ['In-house', 'Delhivery', 'Customer'];

export const PRODUCTION_VIEW_KEYS = [
  'production:read',
  'production:rolling:read',
  'production:printing:read',
  'production:cutting:read',
  'dispatch:read',
];

export const ORDER_TYPES = [
  { id: 'sales_order', label: 'Sales order', prefix: 'SO' },
  { id: 'job_work', label: 'Job work', prefix: 'JW' },
];

export function orderTypeLabel(id) {
  return (ORDER_TYPES.find((type) => type.id === id) || ORDER_TYPES[0]).label;
}

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
};

export const NEXT_STATUS_LABELS = { ...STATUS_LABELS };

export const OPTION_GROUPS = [
  { id: 'productType', label: 'Product type', hint: 'Bag, roll, finished product' },
  { id: 'material', label: 'Material', hint: 'HDPE, LDPE, PP' },
  { id: 'unit', label: 'Unit', hint: 'pcs, kg, roll' },
  { id: 'color', label: 'Colour', hint: 'Red, black, green, golden' },
  { id: 'thickness', label: 'Gauge', hint: '150, 200' },
  { id: 'width', label: 'Width', hint: '20 inch, 500 mm' },
  { id: 'length', label: 'Length', hint: '30 inch, 800 m' },
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
  { id: 'printColor', label: 'Printing colours', hint: 'Red, Black, Golden' },
  { id: 'printDesign', label: 'Printing design', hint: 'Customer logo' },
];

export const OPTION_LIST_SECTIONS = [
  { id: 'product', label: 'Product', groups: ['productType', 'material', 'unit'] },
  { id: 'size', label: 'Size & colour', groups: ['width', 'length', 'thickness', 'color'] },
  { id: 'factory', label: 'Rolling', groups: ['materialType', 'materialGrade', 'additive', 'specialRequirement'] },
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

export function routeHasRoll(route) {
  return String(route || '').startsWith('roll');
}

export function routeHasPrint(route) {
  return String(route || '').includes('print');
}

export function routeHasCut(route) {
  return String(route || '').includes('cut');
}

export function routeStages(route) {
  return PRODUCTION_ROUTES.find((item) => item.id === route)?.stages || ['rolling', 'dispatch'];
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

export const FLOOR_STATUSES = [
  'production_planned',
  'in_production',
  'ready_for_packing',
  'packed',
  'ready_for_dispatch',
  'dispatched',
];

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
  const served = item.stageStats?.[stage];
  if (served) return { ...served };
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
          unit: stats.unit || item.unit || 'pcs',
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
    materialRate: '',
    width: '',
    length: '',
    thickness: '',
    color: '',
    additives: '',
    specialRequirements: '',
  };
}

let uidSeed = 0;
export function lineUid() {
  uidSeed += 1;
  return `line-${Date.now().toString(36)}-${uidSeed}`;
}

export function emptyLineItem() {
  return {
    uid: lineUid(),
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
    image: emptyImage(),
    images: [],
  };
}

export function emptyImage() {
  return { originalName: '', mimeType: '', dataUrl: '', url: '', key: '', storage: '' };
}

export function lineImages(item) {
  const list = Array.isArray(item?.images) ? item.images : [];
  const filled = list.filter((image) => image && (image.url || image.dataUrl || image.key));
  const source = filled.length ? filled : item?.image && (item.image.url || item.image.dataUrl || item.image.key) ? [item.image] : [];
  return source.map((image) => ({
    originalName: image.originalName || '',
    mimeType: image.mimeType || '',
    dataUrl: image.url ? '' : image.dataUrl || '',
    url: image.url || '',
    key: image.key || '',
    storage: image.storage || '',
  }));
}

function sizeParts(size) {
  const match = String(size || '').match(/^\s*([\d.]+)\s*[×x*]\s*([\d.]+)\s*(.*)$/i);
  if (!match) return { width: '', length: '' };
  const unit = match[3].trim();
  return { width: unit ? `${match[1]} ${unit}` : match[1], length: unit ? `${match[2]} ${unit}` : match[2] };
}

function joinUnique(values) {
  const seen = [];
  for (const value of values) {
    const text = String(value || '').trim();
    if (text && !seen.some((item) => item.toLowerCase() === text.toLowerCase())) seen.push(text);
  }
  return seen.join('; ');
}

export function impressionColours(impressions) {
  const match = String(impressions || '').match(/\d+(?:\s*\+\s*\d+)+/);
  if (!match) return 0;
  return match[0].split('+').reduce((sum, part) => sum + Number(part), 0);
}

export function itemFromApi(item) {
  const base = emptyLineItem();
  const m = item.manufacturing || {};
  const printing = item.printing || {};
  const fromSize = sizeParts(item.size);
  const special = joinUnique([m.specialRequirements, printing.specialRequirements, item.holes?.specialRequirements]);
  return {
    ...base,
    uid: base.uid,
    id: item.id,
    templateId: item.templateId || '',
    product: item.product || '',
    productCode: item.productCode || '',
    productType: item.productType || '',
    size: item.size || '',
    material: item.material || m.rawMaterial || '',
    thickness: item.thickness || m.thickness || '',
    width: item.width || m.width || item.bag?.width || fromSize.width,
    length: item.length || m.length || item.bag?.length || fromSize.length,
    color: item.color || m.color || '',
    quantity: item.quantity == null ? '' : String(item.quantity),
    unit: item.unit || 'pcs',
    rate: item.rate == null ? '' : String(item.rate),
    discount: item.discount == null ? '0' : String(item.discount),
    taxPercent: item.taxPercent == null ? '18' : String(item.taxPercent),
    productionRoute: item.productionRoute || base.productionRoute,
    manufacturing: { ...base.manufacturing, ...m, specialRequirements: special },
    roll: { ...base.roll, ...(item.roll || {}) },
    bag: { ...base.bag, ...(item.bag || {}) },
    printing: { ...base.printing, ...printing, artwork: joinUnique([printing.artwork, printing.requirement]), requirement: '' },
    holes: { ...base.holes, ...(item.holes || {}) },
    tape: { ...base.tape, ...(item.tape || {}) },
    image: lineImages(item)[0] || emptyImage(),
    images: lineImages(item),
  };
}

export function applyTemplate(item, template) {
  const next = itemFromApi(template);
  return {
    ...next,
    uid: item.uid || next.uid,
    id: item.id,
    templateId: template.id,
    quantity: item.quantity,
    discount: item.discount || '0',
    taxPercent: item.taxPercent,
  };
}

export function copyItemsForNewOrder(items) {
  return (items || []).map((item) => ({ ...itemToPayload(itemFromApi(item)), id: undefined }));
}

export function deliveryDateForCopy(value) {
  const date = toDateInput(value);
  return date && date >= toDateInput(new Date()) ? date : '';
}

export function lineSize(item) {
  const parts = [item.width, item.length].map((part) => String(part || '').trim()).filter(Boolean);
  const size = parts.join(' × ');
  return parts.length === 2 && parts.every((part) => /^\d+(\.\d+)?$/.test(part)) ? `${size} inch` : size;
}

export function itemToPayload(item) {
  const shared = { width: item.width, length: item.length };
  const special = item.manufacturing?.specialRequirements || '';
  return {
    id: item.id,
    product: item.product,
    productCode: item.productCode,
    productType: item.productType,
    size: lineSize(item) || item.size,
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
    templateId: item.templateId || '',
    productionRoute: item.productionRoute,
    manufacturing: { ...item.manufacturing, ...shared, thickness: item.thickness, color: item.color, rawMaterial: item.material },
    roll: item.roll,
    bag: { ...item.bag, ...shared },
    printing: {
      ...item.printing,
      required: routeHasPrint(item.productionRoute) || Boolean(item.printing?.required),
      requirement: '',
      specialRequirements: special,
    },
    holes: { ...item.holes, required: Boolean(item.holes?.required), specialRequirements: special },
    tape: { ...item.tape, required: Boolean(item.tape?.required) },
    image: lineImages(item)[0] || emptyImage(),
    images: lineImages(item),
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

export function calcOrder(items, orderDiscount, advanceAmount, paidAmount = 0) {
  let subtotal = 0;
  let tax = 0;
  for (const item of items) {
    const taxable = Math.max(0, (Number(item.quantity) || 0) * (Number(item.rate) || 0) - (Number(item.discount) || 0));
    subtotal += taxable;
    tax += (taxable * (Number(item.taxPercent) || 0)) / 100;
  }
  const discount = Math.max(0, Number(orderDiscount) || 0);
  const grandTotal = Math.max(0, subtotal - discount + tax);
  const remaining = Math.max(0, grandTotal - Math.max(0, Number(advanceAmount) || 0) - (Number(paidAmount) || 0));
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
