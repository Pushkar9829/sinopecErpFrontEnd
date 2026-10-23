import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

// List filters, page and rows-per-page kept in the address bar, so a refresh,
// the Back button or a shared link shows the same list. Values equal to their
// default are left out of the URL. Changing any filter goes back to page 1.
// `prefix` keeps lists on different tabs of one page apart: with prefix 'pay'
// the names are pay.page, pay.status and so on.
export function useListParams(defaults = {}, { pageSize: defaultPageSize = 25, prefix = '' } = {}) {
  const [params, setParams] = useSearchParams();
  const urlName = useCallback((name) => (prefix ? `${prefix}.${name}` : name), [prefix]);
  const key = JSON.stringify(defaults);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const base = useMemo(() => defaults, [key]);

  const values = useMemo(() => {
    const out = {};
    for (const [name, fallback] of Object.entries(base)) out[name] = params.get(urlName(name)) ?? fallback;
    return out;
  }, [params, base, urlName]);
  const page = Math.max(1, Number(params.get(urlName('page'))) || 1);
  const pageSize = Math.min(100, Math.max(5, Number(params.get(urlName('rows'))) || defaultPageSize));

  const update = useCallback(
    (changes, { keepPage = false } = {}) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          for (const [name, value] of Object.entries(changes)) {
            const fallback = name === 'page' ? 1 : name === 'rows' ? defaultPageSize : base[name];
            if (value === undefined || value === null || value === '' || String(value) === String(fallback ?? '')) next.delete(urlName(name));
            else next.set(urlName(name), String(value));
          }
          if (!keepPage && !('page' in changes)) next.delete(urlName('page'));
          return next;
        },
        { replace: true }
      );
    },
    [setParams, base, defaultPageSize, urlName]
  );

  return {
    values,
    set: (name, value) => update({ [name]: value }),
    setMany: (changes) => update(changes),
    reset: () => update(Object.fromEntries(Object.keys(base).map((name) => [name, base[name]]))),
    page,
    setPage: (next) => update({ page: next }, { keepPage: true }),
    pageSize,
    setPageSize: (next) => update({ rows: next }),
    active: Object.entries(base).filter(([name, fallback]) => values[name] !== fallback).length,
  };
}

// A search box value that settles after the user stops typing.
export function useDebounced(value, delay = 300) {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return settled;
}

// Like useState, but the value lives in the address bar (?name=value), so a
// refresh or a shared link keeps it. The default value is left out of the URL.
export function useUrlState(name, fallback = '') {
  const [params, setParams] = useSearchParams();
  const value = params.get(name) ?? fallback;
  const setValue = useCallback(
    (next) => {
      setParams(
        (current) => {
          const out = new URLSearchParams(current);
          const resolved = typeof next === 'function' ? next(current.get(name) ?? fallback) : next;
          if (resolved === undefined || resolved === null || resolved === '' || resolved === fallback) out.delete(name);
          else out.set(name, String(resolved));
          return out;
        },
        { replace: true }
      );
    },
    [name, fallback, setParams]
  );
  return [value, setValue];
}
