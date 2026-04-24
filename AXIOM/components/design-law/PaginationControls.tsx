interface PaginationControlsProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  itemLabel?: string;
}

export function PaginationControls({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  itemLabel = 'items',
}: PaginationControlsProps) {
  const startIdx = (page - 1) * limit + 1;
  const endIdx = Math.min(page * limit, total);

  return (
    <div className="flex items-center justify-between mt-6 pt-4 border-t border-dl-border-light">
      <p className="text-xs text-dl-gray">
        Showing {startIdx}–{endIdx} of {total} {itemLabel}
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className={`px-4 py-1.5 text-sm ${
            page <= 1
              ? 'bg-dl-border text-dl-gray-light cursor-not-allowed'
              : 'bg-dl-navy text-white'
          }`}
        >
          Previous
        </button>
        <span className="text-sm font-dl-mono text-dl-gray">
          Page {page} of {totalPages}
        </span>
        <button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className={`px-4 py-1.5 text-sm ${
            page >= totalPages
              ? 'bg-dl-border text-dl-gray-light cursor-not-allowed'
              : 'bg-dl-navy text-white'
          }`}
        >
          Next
        </button>
      </div>
    </div>
  );
}
