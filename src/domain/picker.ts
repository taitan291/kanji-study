import { shuffle, type Rng } from "./random";
import type { QuestionId } from "./types";
import type { ReviewEntry } from "./review";

/** 候補から count 問をランダムに選び、順番もランダムにする（仕様書 9.4）。 */
export function pickRandom(
  candidates: readonly QuestionId[],
  count: number,
  rng: Rng,
): QuestionId[] {
  const unique = [...new Set(candidates)];
  return shuffle(unique, rng).slice(
    0,
    Math.max(0, Math.min(count, unique.length)),
  );
}

/**
 * 優先する問題を先に選ぶ出題。priority に入っている候補（間違えた問題・まだ解いていない問題のうちオンにしたもの）から
 * ランダムに選び、足りない分だけ残りから選ぶ。選んだ中の順番はランダムにする。
 */
export function pickPrioritized(
  candidates: readonly QuestionId[],
  count: number,
  priority: ReadonlySet<QuestionId>,
  rng: Rng,
): QuestionId[] {
  const unique = [...new Set(candidates)];
  const first = shuffle(
    unique.filter((id) => priority.has(id)),
    rng,
  );
  const rest = shuffle(
    unique.filter((id) => !priority.has(id)),
    rng,
  );
  const n = Math.max(0, Math.min(count, unique.length));
  return shuffle([...first, ...rest].slice(0, n), rng);
}

/**
 * 優先する問題: 最後の解答が × の問題（1回間違えても、次に正解すれば外れる）と、まだ一度も解いていない問題
 */
export function priorityIds(
  candidates: readonly QuestionId[],
  latest: ReadonlyMap<QuestionId, boolean>,
): { wrong: QuestionId[]; unanswered: QuestionId[] } {
  return {
    wrong: candidates.filter((id) => latest.get(id) === false),
    unanswered: candidates.filter((id) => !latest.has(id)),
  };
}

/**
 * 復習の出題（仕様書 6.3）。連続正解の少ないもの、次に間違えた回数の多いものを優先して選び、
 * 選んだ中の順番はランダムにする。同じ優先度の中ではランダム。
 */
export function pickReview(
  entries: readonly ReviewEntry[],
  count: number,
  rng: Rng,
): QuestionId[] {
  const prioritized = shuffle(entries, rng).sort(
    (a, b) => a.streak - b.streak || b.wrongCount - a.wrongCount,
  );
  const chosen = prioritized
    .slice(0, Math.max(0, count))
    .map((e) => e.questionId);
  return shuffle(chosen, rng);
}

/** 問題数の「すべて」を表す値（設定にもこの値で保存する） */
export const ALL_QUESTIONS = 0;

/** 実際に出す問題数。「すべて」なら対象の全部、多すぎる指定は対象の数まで */
export function resolveCount(wanted: number, available: number): number {
  if (wanted === ALL_QUESTIONS) return available;
  return Math.max(0, Math.min(Math.floor(wanted), available));
}
