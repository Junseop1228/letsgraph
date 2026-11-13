import { PagePlaceholder } from "@/components/page-placeholder";

export default function AnalysisPage() {
  return (
    <PagePlaceholder
      title="분석"
      summary="공고를 정리하고, 내 경험이 공고의 요구 역량과 어떻게 이어지는지 확인해요."
      next={["공고 올리기와 공고 정리", "포트폴리오 업로드와 경험 추출", "연결 결과와 Prompt Kit"]}
    />
  );
}