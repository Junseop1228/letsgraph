"use client";
// 내 공고 표 (specs/posting POST-02): sort by deadline/company/status and filter by status. TanStack Table (MIT).
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp } from "lucide-react";
import { POSTING_STATUS_LABEL, type JobPosting, type PostingStatus } from "@/lib/contracts/activity";
import { dDay } from "@/lib/format";
import { cn } from "@/lib/utils";

const col = createColumnHelper<JobPosting>();
const STATUSES = Object.keys(POSTING_STATUS_LABEL) as PostingStatus[];

export function PostingsTable({ postings }: { postings: JobPosting[] }) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "deadline", desc: false }]);
  const [status, setStatus] = useState<PostingStatus | "all">("all");
  const columns = useMemo(
    () => [
      col.accessor((p) => `${p.companyName} ${p.title}`, {
        id: "posting",
        header: "공고",
        cell: (c) => (
          <Link href={`/analysis/posting/${c.row.original.id}`} className="block rounded-inner hover:underline">
            <span className="block text-label-strong">{c.row.original.companyName} · {c.row.original.title}</span>
            <span className="block text-caption text-text-secondary">{c.row.original.source === "demo" ? "데모용 예시 공고" : "내가 올린 공고"}</span>
          </Link>
        ),
      }),
      col.accessor((p) => p.deadline ?? "9999-12-31", {
        id: "deadline",
        header: "마감",
        cell: (c) => {
          const p = c.row.original;
          const d = dDay(p.deadline);
          const urgent = /^D-(\d+)$/.test(d) && Number(d.slice(2)) <= 7;
          return (
            <span className="flex items-center gap-2">
              <span className={cn("figures h-[22px] min-w-12 rounded-inner px-2 text-center text-data-sm leading-[22px]", urgent ? "bg-error-muted text-text-error" : "bg-bg-tonal text-text-secondary")}>{d}</span>
              <span className="figures text-caption text-text-secondary">{p.deadline ? p.deadline.replaceAll("-", ".") : p.deadlineNote ?? "미정"}</span>
            </span>
          );
        },
      }),
      col.accessor("status", {
        header: "상태",
        filterFn: "equals",
        sortingFn: (a, b) => STATUSES.indexOf(a.original.status) - STATUSES.indexOf(b.original.status),
        cell: (c) => <span className="h-[22px] rounded-inner bg-bg-tonal px-2 text-data-sm leading-[22px] text-text-secondary">{POSTING_STATUS_LABEL[c.getValue()]}</span>,
      }),
    ],
    [],
  );
  // stable reference: a new array every render makes the table reset and re-render forever
  const columnFilters = useMemo(() => (status === "all" ? [] : [{ id: "status", value: status }]), [status]);
  const table = useReactTable({
    data: postings,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="space-y-3">
      <div role="group" aria-label="상태로 거르기" className="flex flex-wrap gap-1.5">
        {(["all", ...STATUSES] as const).map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={status === s}
            onClick={() => setStatus(s)}
            className={cn("h-8 rounded-element border px-3 text-label", status === s ? "border-bg-selected bg-bg-selected font-semibold" : "border-border-emphasized hover:bg-overlay-hover")}
          >
            {s === "all" ? "전체" : POSTING_STATUS_LABEL[s]}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] border-collapse text-left">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-border">
                {hg.headers.map((h) => {
                  const dir = h.column.getIsSorted();
                  return (
                    <th key={h.id} scope="col" aria-sort={dir === "asc" ? "ascending" : dir === "desc" ? "descending" : "none"} className="py-2 pr-3 text-caption font-normal text-text-secondary">
                      <button type="button" onClick={h.column.getToggleSortingHandler()} className="inline-flex items-center gap-1 rounded-inner hover:text-text-primary">
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        {dir === "asc" ? <ArrowUp className="size-3.5" aria-hidden /> : dir === "desc" ? <ArrowDown className="size-3.5" aria-hidden /> : null}
                      </button>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((r) => (
              <tr key={r.id} className="border-b border-border hover:bg-overlay-hover">
                {r.getVisibleCells().map((c) => (
                  <td key={c.id} className="py-3 pr-3 align-middle">{flexRender(c.column.columnDef.cell, c.getContext())}</td>
                ))}
              </tr>
            ))}
            {table.getRowModel().rows.length === 0 && (
              <tr>
                <td colSpan={3} className="py-6 text-center text-body text-text-secondary">이 상태의 공고가 없어요.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
