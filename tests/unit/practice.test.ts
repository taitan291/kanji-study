import { describe, expect, it } from "vitest";
import {
  practiceQuestions,
  type PracticeSource,
} from "../../src/domain/practice";
import { computeReview } from "../../src/domain/review";
import { statsByQuestion } from "../../src/domain/stats";
import { att, loadFixtureQuestions } from "./helpers";

const qs = loadFixtureQuestions();

describe("練習する問題", () => {
  // 49-2 は × のあと3回 ○ でリストから外れた。50-1 はいま復習リストにある。99-1 は問題データに無い
  const a = [
    att("49-1", true, 1),
    att("49-2", false, 1),
    att("50-1", false, 2),
    att("49-2", true, 3),
    att("49-2", true, 4),
    att("49-2", true, 5),
    att("99-1", false, 5),
  ];
  const review = computeReview(a, 3);
  const stats = statsByQuestion(a, qs);
  const ids = (source: PracticeSource) =>
    practiceQuestions(qs, review, stats, source).map((q) => q.id);

  it("復習リスト: いまリストにある問題だけ（問題の順）", () => {
    expect(ids("review")).toEqual(["50-1"]);
  });

  it("間違えたことがある全部: 外れた問題も含む。問題データに無いものは除く", () => {
    expect(ids("missed")).toEqual(["49-2", "50-1"]);
  });

  it("すべての問題: 間違えていない問題も含めて、問題データの全部", () => {
    expect(ids("all")).toEqual(qs.map((q) => q.id));
  });
});
