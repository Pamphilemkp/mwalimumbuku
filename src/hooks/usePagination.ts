import { useState, useMemo } from 'react';

export function usePagination<T>(items: T[] | undefined, pageSize = 10) {
  const [page, setPage] = useState(1);

  const totalItems = items?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);

  const paginated = useMemo(() => {
    if (!items) return [];
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safePage, pageSize]);

  const goTo = (p: number) => setPage(Math.max(1, Math.min(p, totalPages)));
  const next = () => goTo(safePage + 1);
  const prev = () => goTo(safePage - 1);

  return {
    page: safePage,
    totalPages,
    totalItems,
    paginated,
    goTo,
    next,
    prev,
    hasNext: safePage < totalPages,
    hasPrev: safePage > 1,
  };
}
