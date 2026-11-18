import type { Question } from "./types";

/** 漢字一覧の絞り込み */
export interface KanjiListFilter {
  /** 回で絞る。null はすべての回 */
  round: number | null;
  /** 漢字・読み・例文・意味に含まれる文字で探す（空なら絞らない） */
  query: string;
}

export const NO_LIST_FILTER: KanjiListFilter = { round: null, query: "" };

/** ひらがなをカタカナにする（読みはカタカナなので、ひらがなで探しても見つかるように） */
export function toKatakana(text: string): string {
  return text.replace(/[ぁ-ゖ]/g, (c) =>
    String.fromCharCode(c.charCodeAt(0) + 0x60),
  );
}

/** 問題を絞り込む（並びは変えない） */
export function filterKanjiList(
  list: readonly Question[],
  filter: KanjiListFilter,
): Question[] {
  const query = toKatakana(filter.query.trim());
  return list.filter((q) => {
    if (filter.round !== null && q.round !== filter.round) return false;
    if (query) {
      const text = toKatakana(`${q.kanji} ${q.yomi} ${q.furu} ${q.imi}`);
      if (!text.includes(query)) return false;
    }
    return true;
  });
}

export interface RoundGroup {
  round: number;
  questions: Question[];
}

/** 回ごとにまとめる。回は小さい順、回の中は渡された順のまま */
export function groupByRound(list: readonly Question[]): RoundGroup[] {
  const map = new Map<number, Question[]>();
  for (const q of list) {
    const g = map.get(q.round);
    if (g) g.push(q);
    else map.set(q.round, [q]);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a - b)
    .map(([round, questions]) => ({ round, questions }));
}
