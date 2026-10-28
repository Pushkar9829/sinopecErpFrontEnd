// Editable copy of a draft order's proposal (what the reader found).
export function emptyLine() {
  return { product: '', quantity: '', unit: '', rate: '', material: '', width: '', length: '', flap: '', gusset: '', sizeUnit: '', sizeText: '', thickness: '', thicknessKind: '', notes: '' };
}

export function emptyProposal() {
  return {
    customer: { name: '', companyName: '', mobile: '', email: '', gstNumber: '', billingAddress: '', shippingAddress: '' },
    lines: [emptyLine()],
    deliveryDate: '',
    notes: '',
    certainty: { customer: 'missing', lines: 'missing' },
    isOrder: true,
    warnings: [],
  };
}

export function toEditable(proposal) {
  const base = emptyProposal();
  if (!proposal) return base;
  const lines = Array.isArray(proposal.lines) && proposal.lines.length ? proposal.lines : [emptyLine()];
  return {
    ...base,
    ...proposal,
    customer: { ...base.customer, ...(proposal.customer || {}) },
    lines: lines.map((line) => ({
      ...emptyLine(),
      ...line,
      quantity: line.quantity ?? '',
      rate: line.rate ?? '',
      thickness: line.thickness ?? '',
    })),
  };
}

export function toPayload(proposal) {
  return {
    ...proposal,
    lines: proposal.lines.filter((line) =>
      [line.product, line.quantity, line.unit, line.rate, line.material, line.width, line.length, line.flap, line.gusset, line.thickness, line.notes].some(
        (value) => String(value ?? '').trim() !== ''
      )
    ),
  };
}
