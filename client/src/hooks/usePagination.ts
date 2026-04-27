import { useCallback, useState } from "react";

export interface PaginatedParams {
  page: number;
  pageSize: number;
  totalCount?: number;
}

interface UsePaginationReturn {
  currentPage: number;
  setCurrentPage: (page: number) => void;
  handlePageChange: (page: number, totalPages: number) => void;
  getPageNumbers: (totalPages: number) => (number | "ellipsis")[];
  canGoPrevious: boolean;
  canGoNext: (totalPages: number) => boolean;
}

export function usePagination(initialPage = 1): UsePaginationReturn {
  const [currentPage, setCurrentPage] = useState(initialPage);

  const handlePageChange = useCallback((page: number, totalPages: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  const getPageNumbers = useCallback(
    (totalPages: number): (number | "ellipsis")[] => {
      const pages: (number | "ellipsis")[] = [];
      const showEllipsisStart = currentPage > 3;
      const showEllipsisEnd = currentPage < totalPages - 2;

      if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        if (showEllipsisStart) pages.push("ellipsis");

        const start = Math.max(2, currentPage - 1);
        const end = Math.min(totalPages - 1, currentPage + 1);
        for (let i = start; i <= end; i++) pages.push(i);

        if (showEllipsisEnd) pages.push("ellipsis");
        pages.push(totalPages);
      }
      return pages;
    },
    [currentPage],
  );

  const canGoPrevious = currentPage > 1;
  const canGoNext = useCallback(
    (totalPages: number) => currentPage < totalPages,
    [currentPage],
  );

  return {
    currentPage,
    setCurrentPage,
    handlePageChange,
    getPageNumbers,
    canGoPrevious,
    canGoNext,
  };
}
