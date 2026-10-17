import { useMemo, useState } from 'react';

export function usePagedList(items, { pageSize = 8, resetKey } = {}) {
  // The page belongs to the current filters (resetKey) and page size; when
  // either changes the list starts again at page 1 without an extra render.
  const key = `${resetKey}|${pageSize}`;
  const [state, setState] = useState({ key, page: 1 });
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(state.key === key ? state.page : 1, totalPages);

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  return {
    page,
    setPage: (next) => setState({ key, page: next }),
    totalPages,
    paged,
    total: items.length,
    pageSize,
  };
}
