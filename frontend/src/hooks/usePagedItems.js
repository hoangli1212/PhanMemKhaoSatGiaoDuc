import { useState } from "react";

function usePagedItems(items, pageSize = 6) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;

  return {
    page: currentPage,
    totalPages,
    pageItems: items.slice(start, start + pageSize),
    setPage,
  };
}

export { usePagedItems };
