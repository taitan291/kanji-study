import { describe, expect, it } from "vitest";
import {
  NO_LIST_FILTER,
  filterKanjiList,
  groupByRound,
  toKatakana,
} from "../../src/domain/kanji-list";
import { loadFixtureQuestions } from "./helpers";

const qs = loadFixtureQuestions();
const ids = (list: { id: string }[]) => list.map((q) => q.id);

describe("漢字一覧", () => {
  it("絞り込まなければ全部を問題の順で返す", () => {
    expect(ids(filterKanjiList(qs, NO_LIST_FILTER))).toEqual(ids(qs));
  });

  it("回で絞り込める", () => {
    expect(ids(filterKanjiList(qs, { round: 50, query: "" }))).toEqual([
      "50-1",
      "50-2",
      "50-3",
    ]);
  });

  it("漢字・読み・例文・意味で探せる。前後の空白は無視する", () => {
    const find = (query: string) =>
      ids(filterKanjiList(qs, { round: null, query }));
    expect(find("地図")).toEqual(["49-2"]);
    expect(find(" テガミ ")).toEqual(["49-10"]);
    expect(find("校庭")).toEqual(["49-5"]);
    expect(find("学ぶ")).toEqual(["49-1"]);
  });

  it("読みはひらがなで探しても見つかる", () => {
    expect(
      ids(filterKanjiList(qs, { round: null, query: "がっこう" })),
    ).toEqual(["49-1"]);
    expect(toKatakana("ちず・ABC")).toBe("チズ・ABC");
  });

  it("回と文字の両方で絞り込める", () => {
    expect(filterKanjiList(qs, { round: 50, query: "学" })).toEqual([]);
  });

  it("回ごとにまとめる（回は小さい順、回の中の順は保つ）", () => {
    const groups = groupByRound([...qs].reverse());
    expect(groups.map((g) => g.round)).toEqual([49, 50, 52]);
    expect(ids(groups[0]!.questions)).toEqual([
      "49-10",
      "49-5",
      "49-2",
      "49-1",
    ]);
  });
});
