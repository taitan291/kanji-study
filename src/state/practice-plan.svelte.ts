import type { Mode, QuestionId, RangeSpec } from "../domain/types";

/**
 * 練習してから解く予定（画面の中だけ。保存しない）。
 * retry: 結果画面の「間違えた問題を練習してからもう一度」、review: 復習画面の「練習してから復習する」。
 */
export interface PracticePlan {
  kind: "retry" | "review";
  /** 練習する問題（retry はその回で間違えた問題、review はこれから復習する問題） */
  questionIds: QuestionId[];
  /** 練習のあとに解く回 */
  retry: { questionIds: QuestionId[]; mode: Mode; range?: RangeSpec };
}

class PracticePlanState {
  current = $state.raw<PracticePlan | null>(null);

  set(plan: PracticePlan) {
    this.current = plan;
  }
  clear() {
    this.current = null;
  }
}

export const practicePlan = new PracticePlanState();
