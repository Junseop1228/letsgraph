"use client";
// Prompt Kit 복사·내려받기 (specs/prompt-kit FR-PREM-03). PDF = the browser's print dialog on a print-only layout.
import { useState } from "react";
import { Copy, Download, Printer } from "lucide-react";
import { btn } from "@/components/lg/ui";
import { track } from "@/lib/client/analytics";

export function KitActions({ text, markdown, filename }: { text: string; markdown: string; filename: string }) {
  const [msg, setMsg] = useState<string | null>(null);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      track("kit_copy");
      setMsg("복사했어요. 쓰는 AI 대화창에 붙여 넣으세요.");
    } catch {
      setMsg("복사하지 못했어요. 아래 내용을 직접 선택해 주세요.");
    }
  }
  function download() {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${filename}.md`;
    a.click();
    track("kit_download");
    URL.revokeObjectURL(a.href);
  }
  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <button type="button" onClick={copy} className={btn.primary}><Copy className="size-4" aria-hidden /> 복사</button>
      <button type="button" onClick={download} className={btn.secondary}><Download className="size-4" aria-hidden /> 마크다운</button>
      <button type="button" onClick={() => window.print()} className={btn.secondary}><Printer className="size-4" aria-hidden /> PDF</button>
      {msg && <p role="status" className="text-label text-text-secondary">{msg}</p>}
    </div>
  );
}
