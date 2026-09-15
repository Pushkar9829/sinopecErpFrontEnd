import { useEffect, useMemo, useState } from 'react';

export function usePagedList(items, { pageSize = 8, resetKey } = {}) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  useEffect(() => {
    setPage(1);
  }, [resetKey, pageSize]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const paged = useMemo(() => {
    const start = (Math.min(page, totalPages) - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize, totalPages]);

  return {
    page: Math.min(page, totalPages),
    setPage,
    totalPages,
    paged,
    total: items.length,
    pageSize,
  };
}
