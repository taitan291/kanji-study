import type { Mode, QuestionId, RangeSpec } from "../domain/types";
import { activeQuiz } from "./active-quiz.svelte";
import { router } from "./router.svelte";

/** 途中の回を破棄してよいと決まったあとに行うこと */
type Action = () => void | Promise<void>;

/**
 * 新しい回を始める窓口。採点が終わっていない回があれば、破棄してよいかを先に聞く（仕様書 4.4）。
 * 確認のダイアログは App が `launcher.waiting` を見て出す。
 */
class Launcher {
  waiting = $state.raw<Action | null>(null);

  async launch(questionIds: QuestionId[], mode: Mode, range?: RangeSpec) {
    if (questionIds.length === 0) return;
    await this.beforeNewQuiz(async () => {
      await activeQuiz.start(questionIds, mode, range);
      router.go("answer");
    });
  }

  /**
   * 新しい回につながる操作（「練習してから復習する」など）を、途中の回の確認をしてから行う。
   * 練習を終えたあとではなく、練習を始める前に聞くためのもの。
   */
  async beforeNewQuiz(action: Action) {
    if (activeQuiz.hasUnfinished) {
      this.waiting = action;
      return;
    }
    await action();
  }

  /** 途中の回を破棄して進める */
  async confirm() {
    const action = this.waiting;
    this.waiting = null;
    if (!action) return;
    await activeQuiz.discard();
    await action();
  }

  cancel() {
    this.waiting = null;
  }
}

export const launcher = new Launcher();
