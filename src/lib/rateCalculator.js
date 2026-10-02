export function num(value) {
  if (value === '' || value === null || value === undefined) return 0;
  const parsed = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

// Sheet 2, row 7 (card 261, 20X28, 1+0).
export const JOB_WORK_EXAMPLE = {
  printOn: true,
  pcs: '25150',
  printRate: '115',
  printMinimum: '225',
  cutOn: true,
  kg: '858.85',
  cutRate: '5',
  cutMinimum: '100',
  holeOn: false,
  holePcs: '',
  holeRate: '20',
};

// Sheet 3, line 1 (12 x 16 x 150).
export const SALES_ORDER_EXAMPLE = {
  width: '12',
  length: '16',
  gauge: '150',
  divisor: '3300',
  materialRate: '160',
  printOn: true,
  printRate: '70',
  cutOn: true,
  cutRate: '6',
  holeOn: true,
  holeRate: '20',
  tapeOn: true,
  tapeRate: '20',
  margin: '25',
  quantity: '',
};

export function jobWork(input) {
  const pcs = num(input.pcs);
  const printBase = (pcs * num(input.printRate)) / 1000;
  const printing = input.printOn && printBase > 0 ? Math.max(printBase, num(input.printMinimum)) : 0;

  const cutBase = num(input.kg) * num(input.cutRate);
  const cutting = input.cutOn && cutBase > 0 ? Math.max(cutBase, num(input.cutMinimum)) : 0;

  const holePcs = input.holePcs === '' ? pcs : num(input.holePcs);
  const hole = input.holeOn ? (holePcs * num(input.holeRate)) / 1000 : 0;

  return {
    printBase,
    printing,
    printMinimumUsed: printing > printBase + 1e-9,
    cutBase,
    cutting,
    cutMinimumUsed: cutting > cutBase + 1e-9,
    holePcs,
    hole,
    total: printing + cutting + hole,
  };
}

export function salesOrder(input) {
  const width = num(input.width);
  const divisor = num(input.divisor);
  const weight = divisor > 0 ? (width * num(input.length) * num(input.gauge)) / divisor : 0;
  const material = weight * num(input.materialRate);
  const printing = input.printOn ? num(input.printRate) : 0;
  const cutting = input.cutOn ? weight * num(input.cutRate) : 0;
  const hole = input.holeOn ? num(input.holeRate) : 0;
  const tape = input.tapeOn ? width * num(input.tapeRate) : 0;
  const cost = material + printing + cutting + hole + tape;
  const margin = num(input.margin);
  const quote = cost * (1 + margin / 100);
  const quantity = num(input.quantity);

  return {
    weight,
    material,
    printing,
    cutting,
    hole,
    tape,
    cost,
    marginAmount: quote - cost,
    quote,
    perPiece: quote / 1000,
    perKg: weight > 0 ? quote / weight : 0,
    quantity,
    orderValue: quantity > 0 ? (quote * quantity) / 1000 : 0,
  };
}
