import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

// Pages a list in the browser. With `url: true` the page and rows-per-page
// live in the address bar (?page=&rows=), so refresh and Back keep them; use
// it only where one list is on the page.
export function usePagedList(items, { pageSize: defaultSize = 8, resetKey, url = false } = {}) {
  const [params, setParams] = useSearchParams();
  const [localSize, setLocalSize] = useState(defaultSize);
  const urlSize = Number(params.get('rows'));
  const pageSize = url && urlSize >= 5 && urlSize <= 100 ? urlSize : localSize;

  // The page belongs to the current filters (resetKey) and page size; when
  // either changes the list starts again at page 1.
  const key = `${resetKey}|${pageSize}`;
  const [state, setState] = useState({ key, page: 1 });
  const urlPage = Math.max(1, Number(params.get('page')) || 1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(url ? urlPage : state.key === key ? state.page : 1, totalPages);

  const lastKey = useRef(key);
  useEffect(() => {
    if (!url || lastKey.current === key) return;
    lastKey.current = key;
    if (params.get('page')) {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          next.delete('page');
          return next;
        },
        { replace: true }
      );
    }
  }, [url, key, params, setParams]);

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  function setUrl(name, value, fallback) {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (!value || value === fallback) next.delete(name);
        else next.set(name, String(value));
        if (name === 'rows') next.delete('page');
        return next;
      },
      { replace: true }
    );
  }

  return {
    page,
    setPage: (next) => (url ? setUrl('page', next, 1) : setState({ key, page: next })),
    totalPages,
    paged,
    total: items.length,
    pageSize,
    setPageSize: (next) => (url ? setUrl('rows', next, defaultSize) : setLocalSize(next)),
  };
}
