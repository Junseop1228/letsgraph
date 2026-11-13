// Loading placeholder in the final layout (DESIGN.md States: loading = gray skeleton, no layout shift).
export function PageSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="mx-auto max-w-content-max space-y-4 px-5 py-8" aria-busy="true" aria-label="불러오는 중">
      <div className="h-4 w-40 rounded-inner bg-skeleton" />
      <div className="h-8 w-72 rounded-inner bg-skeleton" />
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-28 rounded-container bg-skeleton" />
      ))}
    </div>
  );
}
