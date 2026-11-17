import { Check } from "lucide-react";
import { PASS_CATALOG, FREE_LIMITS, type PassType } from "@/lib/contracts/billing";
import { tossEnabled } from "@/lib/billing/confirm";
import { supabaseEnabled } from "@/lib/data";
import { Kicker } from "@/components/lg/ui";
import { CheckoutButton } from "@/components/billing/checkout-button";

export const metadata = { title: "패스 · letsGraph" };

// 패스 구매 (specs/billing FR-ACCT-03). Prices are PROPOSED placeholders until the team sets pricing.
export default function BillingPage() {
  const enabled = tossEnabled() && supabaseEnabled();
  return (
    <div className="mx-auto max-w-content-max px-5 py-8">
      <h1 className="text-heading-1">패스</h1>
      <p className="mt-1 max-w-reading-max text-body-lg text-text-secondary">
        공고 등록은 로그인만 하면 무제한이에요. 무료로는 활동과 에피소드를 각각 {FREE_LIMITS.activity_save}개까지 저장할 수 있어요. 시즌 패스가 있으면 저장 한도 없이, 연결 결과와 프롬프트 키트까지 모두 쓸 수 있어요.
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {(Object.keys(PASS_CATALOG) as PassType[]).map((k) => {
          const p = PASS_CATALOG[k];
          return (
            <section key={k} className="flex flex-col gap-4 rounded-container border border-border p-6">
              <Kicker>{p.name}</Kicker>
              <p>
                <span className="figures text-figure-hero">{p.price.toLocaleString("ko-KR")}</span>
                <span className="text-body text-text-secondary">원 · {p.days}일</span>
              </p>
              <ul className="space-y-1.5 text-body">
                {p.includes.map((x) => (
                  <li key={x} className="flex items-center gap-2"><Check className="size-4" aria-hidden />{x}</li>
                ))}
              </ul>
              <div className="mt-auto">
                <CheckoutButton passType={k} label={`${p.name} 결제하기`} enabled={enabled} />
              </div>
            </section>
          );
        })}
      </div>
      <p className="mt-6 text-caption text-text-secondary">
        지금은 토스페이먼츠 테스트 모드라 실제로 돈이 빠져나가지 않아요. 가격은 확정 전 임시 값이에요.
      </p>
    </div>
  );
}
