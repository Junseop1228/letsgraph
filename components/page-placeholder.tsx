type Props = { title: string; summary: string; next: string[] };

// Temporary page body for tabs that are not built yet. Removed as each increment lands.
export function PagePlaceholder({ title, summary, next }: Props) {
  return (
    <section className="mx-auto max-w-content-max px-5 py-10">
      <h1 className="text-heading-1">{title}</h1>
      <p className="mt-2 text-body-lg text-text-secondary max-w-reading-max">{summary}</p>
      <div className="mt-8 rounded-container bg-bg-sunken p-5">
        <p className="text-label text-text-secondary">만들 순서</p>
        <ol className="mt-3 space-y-2 text-body">
          {next.map((n, i) => (
            <li key={n} className="flex gap-3">
              <span className="figures text-text-secondary">{i + 1}</span>
              <span>{n}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}