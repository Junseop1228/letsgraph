import { Check } from "lucide-react";
import { PASS_CATALOG, FREE_LIMITS, POSTING_DAILY_LIMIT, REFUND_POLICY, DAILY_AI_LIMITS, type PassType } from "@/lib/contracts/billing";
import { tossEnabled } from "@/lib/billing/confirm";
import { supabaseEnabled } from "@/lib/data";
import { Kicker } from "@/components/lg/ui";
import { CheckoutButton } from "@/components/billing/checkout-button";
import { cn } from "@/lib/utils";

export const metadata = { title: "패스 · letsGraph" };

// 패스 구매 (specs/billing FR-ACCT-03, BILL-01b): the 30일 패스 and the 시즌 패스 of the BM proposal, with the refund rules.
export default function BillingPage() {
  const enabled = tossEnabled() && supabaseEnabled();
  return (
    <div className="mx-auto max-w-content-max px-5 py-8">
      <h1 className="text-heading-1">패스</h1>
      <p className="mt-1 max-w-reading-max text-body-lg text-text-secondary">
        무료로 탐색하고, 공고를 준비할 때 패스를 사요. 무료로는 공고를 하루 {POSTING_DAILY_LIMIT}건까지 정리하고, 활동과 에피소드를 각각 {FREE_LIMITS.activity_save}개까지 저장하고, AI를 하루 {DAILY_AI_LIMITS.free}번 쓸 수 있어요. 패스가 있으면 저장 한도 없이 공고–경험 연결과 프롬프트 키트까지 쓸 수 있어요.
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {(Object.keys(PASS_CATALOG) as PassType[]).map((k) => {
          const p = PASS_CATALOG[k];
          return (
            <section key={k} className={cn("relative flex flex-col gap-4 rounded-container border p-6", p.best ? "border-border-strong" : "border-border")}>
              <Kicker right={p.best ? <span className="rounded-full bg-bg-inverted px-2.5 py-0.5 text-caption font-semibold text-text-inverted">추천</span> : undefined}>{p.name}</Kicker>
              <p>
                <span className="figures text-figure-hero">{p.price.toLocaleString("ko-KR")}</span>
                <span className="text-body text-text-secondary">원 · {p.days}일 · {p.note}</span>
              </p>
              <ul className="space-y-1.5 text-body">
                {p.includes.map((x) => (
                  <li key={x} className="flex items-center gap-2"><Check className="size-4" aria-hidden />{x}</li>
                ))}
              </ul>
              <div className="mt-auto">
                <CheckoutButton passType={k} label={`${p.name} 결제하기`} enabled={enabled} primary={!!p.best} />
              </div>
            </section>
          );
        })}
      </div>
      <section className="mt-6 space-y-2 rounded-container bg-bg-sunken p-5" aria-labelledby="refund-title">
        <h2 id="refund-title" className="text-label-strong">결제와 환불</h2>
        <ul className="list-disc space-y-1 pl-5 text-body text-text-secondary">
          {REFUND_POLICY.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </section>
      <p className="mt-4 text-caption text-text-secondary">지금은 토스페이먼츠 테스트 모드라 실제로 돈이 빠져나가지 않아요.</p>
    </div>
  );
}
