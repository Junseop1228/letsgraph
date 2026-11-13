import { PagePlaceholder } from "@/components/page-placeholder";

export default function ManagePage() {
  return (
    <PagePlaceholder
      title="관리"
      summary="관심 기업과 공고, 마감 일정, 경험 카드, 이용 등급을 한곳에서 관리해요."
      next={["관심 기업·공고", "마감 캘린더", "경험 카드", "이용 등급과 쿼터"]}
    />
  );
}