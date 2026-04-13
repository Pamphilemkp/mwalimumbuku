import { useState, useMemo } from 'react';

export function usePagination<T>(items: T[] | undefined, pageSize = 5) {
  const [page, setPage] = useState(1);

  const totalItems = items?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);

  const paginatedItems = useMemo(() => {
    if (!items) return [];
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safePage, pageSize]);

  return {
    page: safePage,
    totalPages,
    totalItems,
    paginatedItems,
    setPage,
    nextPage: () => setPage((p) => Math.min(p + 1, totalPages)),
    prevPage: () => setPage((p) => Math.max(p - 1, 1)),
    canNext: safePage < totalPages,
    canPrev: safePage > 1,
  };
}
