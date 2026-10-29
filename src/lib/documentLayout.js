import { useEffect, useState } from 'react';
import { documentLayoutsApi } from '../api/documentLayouts.api';

// The owner's layout for each printed document (Settings → Documents): which
// header fields, table columns and page blocks show, under what names and in
// what order. Loaded once per visit; saving a layout clears the copy.

let cache = null;

export function loadLayouts() {
  if (!cache) {
    cache = documentLayoutsApi.list().catch((err) => {
      cache = null;
      throw err;
    });
  }
  return cache;
}

export function forgetLayouts() {
  cache = null;
}

export async function loadLayout(id) {
  const all = await loadLayouts().catch(() => []);
  return wrap(all.find((l) => l.id === id) || null);
}

// Helpers over one layout. A missing layout (offline, old server) shows
// everything with the page's own labels.
export function wrap(layout) {
  const find = (group, key) => (layout?.[group] || []).find((p) => p.key === key);
  const shows = (group) => (key) => find(group, key)?.show ?? true;
  const names = (group) => (key, fallback) => find(group, key)?.label || fallback;
  return {
    layout,
    title: (fallback) => layout?.title || fallback,
    footerNote: layout?.footerNote || '',
    field: shows('fields'),
    fieldLabel: names('fields'),
    col: shows('columns'),
    colLabel: names('columns'),
    block: shows('blocks'),
    blockLabel: names('blocks'),
    // Header boxes in the owner's order. `values` maps built-in keys to what
    // the page prints; added fields print their fixed text or the order's value.
    fields(values = {}, orderValues = {}) {
      const rows = layout?.fields?.length ? layout.fields : Object.keys(values).map((key) => ({ key, label: key, show: true }));
      return rows
        .filter((f) => f.show)
        .map((f) => {
          const raw = f.custom ? (f.source === 'order' ? orderValues?.[f.key] : f.text) : values[f.key];
          return { key: f.key, label: f.label, value: raw, custom: Boolean(f.custom) };
        })
        .filter((f) => f.value !== undefined && f.value !== null && String(f.value).trim() !== '');
    },
    // Table columns: `defs` is the page's own list ({ key, label, ... });
    // returns the shown ones in the owner's order with the owner's names.
    columns(defs) {
      if (!layout?.columns?.length) return defs;
      const byKey = new Map(defs.map((d) => [d.key, d]));
      const out = [];
      for (const c of layout.columns) {
        const def = byKey.get(c.key);
        if (def && c.show) out.push({ ...def, label: c.label || def.label });
      }
      for (const def of defs) if (!layout.columns.some((c) => c.key === def.key)) out.push(def);
      return out;
    },
  };
}

export function useDocumentLayout(id) {
  const [state, setState] = useState(() => wrap(null));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let live = true;
    loadLayout(id).then((next) => {
      if (!live) return;
      setState(next);
      setReady(true);
    });
    return () => {
      live = false;
    };
  }, [id]);
  return { ...state, ready };
}

// GST state codes, for "State Name : Delhi, Code : 07".
export const GST_STATES = { '01': 'Jammu & Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh', '05': 'Uttarakhand', '06': 'Haryana', '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh', '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh', '13': 'Nagaland', '14': 'Manipur', '15': 'Mizoram', '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam', '19': 'West Bengal', '20': 'Jharkhand', '21': 'Odisha', '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat', '26': 'Dadra & Nagar Haveli and Daman & Diu', '27': 'Maharashtra', '29': 'Karnataka', '30': 'Goa', '31': 'Lakshadweep', '32': 'Kerala', '33': 'Tamil Nadu', '34': 'Puducherry', '35': 'Andaman & Nicobar', '36': 'Telangana', '37': 'Andhra Pradesh', '38': 'Ladakh' };

// A GSTIN starts with its state code.
export function stateCodeOf(gstin, fallback = '') {
  const code = String(gstin || '').slice(0, 2);
  return GST_STATES[code] ? code : fallback;
}
