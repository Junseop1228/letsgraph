import { PagePlaceholder } from "@/components/page-placeholder";

export default function ExplorePage() {
  return (
    <PagePlaceholder
      title="탐색"
      summary="관심 직무를 중심으로 그 직무가 있는 기업과 사업부를 돈의 흐름으로 살펴봐요."
      next={["직무 카드 온보딩", "직무 맵 (직무 → 산업 → 기업)", "기업 상세와 사업부 상세"]}
    />
  );
}