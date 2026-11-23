"use client";
// 공고 삭제 (specs/posting POST-08): asks once (ConfirmDelete), deletes the user's own posting, then goes back to the list.
import { useRouter } from "next/navigation";
import { ConfirmDelete } from "@/components/manage/confirm-delete";
import { deletePostingAction } from "@/app/(main)/postings/actions";

export function DeletePosting({ id }: { id: string }) {
  const router = useRouter();
  return (
    <ConfirmDelete
      label="공고 삭제"
      warning="이 공고와 AI 정리 결과, 지원 근거가 함께 지워지고 되돌릴 수 없어요. 만든 활동·에피소드 카드는 그대로 남아요."
      onConfirm={() => deletePostingAction(id)}
      onDone={() => router.push("/postings")}
    />
  );
}
