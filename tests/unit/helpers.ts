import { readFileSync } from "node:fs";
import { parseQuestions } from "../../src/domain/questions";
import type { Attempt, Question } from "../../src/domain/types";

export function loadFixtureQuestions(): Question[] {
  return parseQuestions(
    JSON.parse(readFileSync("tests/fixtures/questions-small.json", "utf8")),
  ).questions;
}

/** 本物と同じ形（第49〜54回、129問）の見本データ。中身は自作 */
export function loadSampleQuestions(): ReturnType<typeof parseQuestions> {
  return parseQuestions(JSON.parse(readFileSync("example.json", "utf8")));
}

let n = 0;
/** 解答記録を作る。sessionNo ごとに1分ずつ時刻を進める */
export function att(
  questionId: string,
  correct: boolean,
  sessionNo: number,
): Attempt {
  n++;
  return {
    id: `a${String(n).padStart(6, "0")}`,
    questionId,
    sessionId: `s${sessionNo}`,
    mode: "normal",
    correct,
    answeredAt: new Date(Date.UTC(2026, 10, 17, 12, sessionNo)).toISOString(),
  };
}
