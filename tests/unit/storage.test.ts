import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { startQuiz } from "../../src/domain/quiz-session";
import {
  addRecords,
  clearHistory,
  commitSession,
  loadHistory,
} from "../../src/storage/attempts-repo";
import { getDB, resetDBConnection } from "../../src/storage/db";
import {
  deleteDraft,
  loadDraft,
  sanitizeDraft,
  saveDraft,
} from "../../src/storage/drafts-repo";
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
} from "../../src/storage/settings";
import { att } from "./helpers";

class MemoryStorage implements Storage {
  #m = new Map<string, string>();
  get length() {
    return this.#m.size;
  }
  clear() {
    this.#m.clear();
  }
  getItem(k: string) {
    return this.#m.get(k) ?? null;
  }
  key(i: number) {
    return [...this.#m.keys()][i] ?? null;
  }
  removeItem(k: string) {
    this.#m.delete(k);
  }
  setItem(k: string, v: string) {
    this.#m.set(k, v);
  }
}

const quiz = () =>
  startQuiz({
    sessionId: "s1",
    mode: "normal",
    startedAt: "t",
    questionIds: ["49-1", "49-2"],
  });

beforeEach(async () => {
  await resetDBConnection();
  indexedDB.deleteDatabase("kanji-study");
});

describe("IndexedDB", () => {
  it("確定で記録が増え、手書きが消える", async () => {
    await saveDraft({
      quiz: quiz(),
      inks: [[{ type: "pen", width: 0.02, points: [{ x: 0, y: 0 }] }], []],
      savedAt: "t",
    });
    expect((await loadDraft())?.inks[0]).toHaveLength(1);
    await commitSession(
      { id: "s1", startedAt: "t", mode: "normal", count: 2 },
      [att("49-1", true, 1), att("49-2", false, 1)],
    );
    expect(await loadDraft()).toBeNull();
    const h = await loadHistory();
    expect(h.attempts).toHaveLength(2);
    expect(h.sessions).toHaveLength(1);
  });

  it("統合用の一括追加とクリア", async () => {
    await addRecords(
      [{ id: "s2", startedAt: "t", mode: "normal", count: 1 }],
      [att("50-1", true, 2)],
    );
    await saveDraft({ quiz: quiz(), inks: [[], []], savedAt: "t" });
    expect((await loadHistory()).attempts).toHaveLength(1);
    await clearHistory();
    expect(await loadHistory()).toEqual({ attempts: [], sessions: [] });
    expect(await loadDraft()).toBeNull();
  });

  it("壊れた下書きは読まない・手書きは検査する", async () => {
    const db = await getDB();
    await db.put("draft", { bad: true } as never, "current");
    expect(await loadDraft()).toBeNull();
    await db.put(
      "draft",
      { quiz: quiz(), inks: ["x"], savedAt: "t" } as never,
      "current",
    );
    expect((await loadDraft())?.inks).toEqual([[], []]);
    await deleteDraft();
    expect(await loadDraft()).toBeNull();
  });
});

describe("下書きの検査", () => {
  it("位置と採点の長さをそろえ、壊れたものは捨てる", () => {
    const q = quiz();
    const d = sanitizeDraft({
      quiz: { ...q, index: 9, grades: [true] },
      inks: null,
      savedAt: 1,
    });
    expect(d?.quiz.index).toBe(1);
    expect(d?.quiz.grades).toEqual([true, null]);
    expect(d?.inks).toEqual([[], []]);
    expect(d?.savedAt).toBe("");
    expect(sanitizeDraft({ quiz: { ...q, phase: "confirmed" } })).toBeNull();
    expect(sanitizeDraft({ quiz: { ...q, questionIds: [] } })).toBeNull();
    expect(sanitizeDraft({ quiz: { ...q, mode: "x" } })).toBeNull();
    expect(sanitizeDraft(null)).toBeNull();
  });
});

describe("設定", () => {
  it("保存して読める、壊れていれば初期値", () => {
    const s = new MemoryStorage();
    expect(loadSettings(s)).toEqual(DEFAULT_SETTINGS);
    saveSettings(
      {
        ...DEFAULT_SETTINGS,
        penOnly: true,
        lastCount: 5,
        lastRange: { spans: [], rounds: [49] },
      },
      s,
    );
    expect(loadSettings(s)).toMatchObject({
      penOnly: true,
      lastCount: 5,
      lastRange: { rounds: [49] },
    });
    s.setItem("kanji-study:settings", "{bad");
    expect(loadSettings(s)).toEqual(DEFAULT_SETTINGS);
    s.setItem(
      "kanji-study:settings",
      JSON.stringify({ penWidth: "huge", lastCount: -1 }),
    );
    expect(loadSettings(s)).toEqual(DEFAULT_SETTINGS);
    // 0 は「すべて」
    s.setItem("kanji-study:settings", JSON.stringify({ lastCount: 0 }));
    expect(loadSettings(s).lastCount).toBe(0);
  });

  it("優先の設定は2つに分かれ、以前のまとめた設定は両方に引き継ぐ", () => {
    const s = new MemoryStorage();
    saveSettings(
      {
        ...DEFAULT_SETTINGS,
        prioritizeWrong: true,
        prioritizeUnanswered: false,
      },
      s,
    );
    expect(loadSettings(s)).toMatchObject({
      prioritizeWrong: true,
      prioritizeUnanswered: false,
    });
    s.setItem("kanji-study:settings", JSON.stringify({ prioritize: true }));
    expect(loadSettings(s)).toMatchObject({
      prioritizeWrong: true,
      prioritizeUnanswered: true,
    });
  });
});
