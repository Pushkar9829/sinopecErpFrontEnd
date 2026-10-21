// Amount with Dr / Cr, the way ledgers show balances: 1,200.00 Dr.
export function drCr(value) {
  const n = Number(value) || 0;
  if (Math.abs(n) < 0.005) return '0.00';
  return `${Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${n > 0 ? 'Dr' : 'Cr'}`;
}

export const amount = (n) => (Number(n) ? Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '');

export const VOUCHER_TYPES = [
  { id: 'payment', label: 'Payment', hint: 'Money paid out of cash or bank (expenses, wages, rent…)' },
  { id: 'receipt', label: 'Receipt', hint: 'Money received into cash or bank that is not a customer payment' },
  { id: 'contra', label: 'Cash ↔ bank', hint: 'Cash deposited in the bank, or cash withdrawn' },
  { id: 'journal', label: 'Journal', hint: 'Any other entry, with debits and credits' },
];

export const MONEY_GROUPS = ['bank', 'cash'];

// Accounts for a <select>, grouped by their group, customers left out (their
// entries come from billing).
export function accountOptions(accounts, { onlyGroups, exceptGroups } = {}) {
  const groups = new Map();
  for (const a of accounts) {
    if (a.customer || a.supplier || a.isActive === false) continue;
    if (onlyGroups && !onlyGroups.includes(a.group)) continue;
    if (exceptGroups && exceptGroups.includes(a.group)) continue;
    if (!groups.has(a.groupLabel)) groups.set(a.groupLabel, []);
    groups.get(a.groupLabel).push(a);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
}
