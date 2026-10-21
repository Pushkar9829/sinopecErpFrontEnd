import { useEffect, useState } from 'react';
import { api } from '../api/client';

// Which inputs the owner made mandatory (Settings → Form fields). Loaded once
// and shared by every form; `refreshFieldRules()` reloads after a change.
let cached = null;
let pending = null;
const listeners = new Set();

function load() {
  if (!pending) {
    pending = api
      .get('/api/form-fields')
      .then((forms) => {
        cached = Object.fromEntries(forms.map((form) => [form.id, Object.fromEntries(form.fields.map((f) => [f.key, f.required]))]));
        listeners.forEach((fn) => fn(cached));
        return forms;
      })
      .catch(() => {
        pending = null;
        return [];
      });
  }
  return pending;
}

export function refreshFieldRules() {
  pending = null;
  return load();
}

// `required(form, key)` is true when that input must be filled.
export function useFieldRules() {
  const [rules, setRules] = useState(cached);
  useEffect(() => {
    listeners.add(setRules);
    if (!cached) load();
    return () => listeners.delete(setRules);
  }, []);
  return (form, key, fallback = false) => (rules ? Boolean(rules[form]?.[key]) : fallback);
}
