export function formatQty(value) {
  return Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 3 });
}

export function itemQuantityError(items, itemId, quantity) {
  if (quantity === '' || quantity === null || quantity === undefined) return '';
  if (!itemId) return 'Choose the item the quantity is for';
  const qty = Number(quantity);
  if (!Number.isFinite(qty) || qty <= 0) return 'Quantity must be more than 0';
  const item = items.find((entry) => entry.id === itemId);
  const max = Number(item?.quantity) || 0;
  if (max > 0 && qty > max) return `Quantity cannot be more than ${formatQty(max)} ${item.unit || ''} ordered`.trim();
  return '';
}
