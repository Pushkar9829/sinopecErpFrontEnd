const ATTR = 'data-row-selected';

function onClick(event) {
  if (!(event.target instanceof Element)) return;
  const row = event.target.closest('tbody tr');
  if (!row) return;
  const table = row.closest('table');
  if (!table || table.hasAttribute('data-no-row-select')) return;
  if (row.querySelector(':scope > td[colspan]') && row.children.length === 1) return;

  const wasSelected = row.hasAttribute(ATTR);
  for (const other of table.querySelectorAll(`tbody tr[${ATTR}]`)) {
    other.removeAttribute(ATTR);
  }
  if (!wasSelected) row.setAttribute(ATTR, '');
}

export function installRowSelect() {
  if (window.__rowSelectInstalled) return;
  window.__rowSelectInstalled = true;
  document.addEventListener('click', onClick);
}
