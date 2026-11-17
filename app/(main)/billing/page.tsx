import { Check } from "lucide-react";
import { PASS_CATALOG, FREE_MONTHLY_QUOTA, SEASON_MONTHLY_QUOTA, type PassType } from "@/lib/contracts/billing";
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
        연결 결과 전체와 프롬프트 키트는 패스로 열려요. 무료로도 AI 기능(공고 정리, 카드 만들기, 연결 결과)을 합쳐 한 달에 {FREE_MONTHLY_QUOTA}번 쓸 수 있어요.
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {(Object.keys(PASS_CATALOG) as PassType[]).map((k) => {
          const p = PASS_CATALOG[k];
          return (
            <section key={k} className="flex flex-col gap-4 rounded-container border border-border p-6">
              <Kicker>{p.name}</Kicker>
              <p>
                <span className="figures text-figure-hero">{p.price.toLocaleString("ko-KR")}</span>
                <span className="text-body text-text-secondary">원 · {p.days ? `${p.days}일` : `${p.uses}회`}</span>
              </p>
              <ul className="space-y-1.5 text-body">
                {[...p.includes, ...(k === "season" ? [`AI 기능 월 ${SEASON_MONTHLY_QUOTA}회 (무료는 ${FREE_MONTHLY_QUOTA}회)`] : [])].map((x) => (
                  <li key={x} className="flex items-center gap-2"><Check className="size-4" aria-hidden />{x}</li>
                ))}
              </ul>
              <div className="mt-auto">
                <CheckoutButton passType={k} label={`${p.name} 결제하기`} enabled={enabled} primary={k === "season"} />
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
