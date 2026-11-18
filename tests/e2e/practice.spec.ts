import { expect, test } from "@playwright/test";
import { answerOne, drawOn, inkPixels, selectOnlyRound } from "./helpers";

test("間違えた問題を、漢字を見たり隠したりしながら練習できる。記録は増えない", async ({
  page,
}) => {
  await page.goto("/#/practice");
  await expect(page.getByText("練習する問題はありません")).toBeVisible();
  // まだ間違えていなくても、すべての問題なら練習できる
  await page.getByLabel("練習する問題").selectOption("all");
  await expect(page.getByTestId("practice-kanji")).toBeVisible();

  await answerOne(page, false, "setup", 49);
  await expect(page.getByTestId("review-count")).toHaveText("1");
  await page.getByRole("link", { name: "練習する", exact: true }).click();

  await expect(page.getByTestId("progress")).toHaveText("1 / 1");
  await expect(page.getByTestId("furu")).toBeVisible();
  const kanji = page.getByTestId("practice-kanji");
  await expect(kanji).toBeVisible();

  await page.getByRole("button", { name: "漢字を隠す" }).click();
  await expect(kanji).toBeHidden();
  await expect(page.getByTestId("practice-kanji-hidden")).toBeVisible();
  await page.getByRole("button", { name: "漢字を見る" }).click();
  await expect(kanji).toBeVisible();

  await drawOn(page);
  await expect.poll(() => inkPixels(page)).toBeGreaterThan(50);
  await page.getByRole("button", { name: "1つ戻す" }).click();
  await expect.poll(() => inkPixels(page)).toBe(0);

  await page.getByLabel("練習する問題").selectOption("missed");
  await expect(page.getByTestId("progress")).toHaveText("1 / 1");

  // 練習は記録に残らない
  await page.getByRole("link", { name: "戻る" }).click();
  await expect(page.getByTestId("review-count")).toHaveText("1");
  await expect(page.getByText("これまでの解答: 1 問")).toBeVisible();
});

test("採点後に、間違えた問題を練習してから解き直せる", async ({ page }) => {
  await page.goto("/#/setup");
  await selectOnlyRound(page, 49);
  await page.getByLabel("自由に決める").check();
  await page.getByLabel("問題数").fill("2");
  await page.getByRole("button", { name: "2 問で始める" }).click();
  await page.getByRole("button", { name: "次の問題" }).click();
  await page.getByRole("button", { name: "採点へ進む" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "採点へ進む" })
    .click();
  await page.getByRole("button", { name: "不正解（×）" }).click();
  await expect(page.getByTestId("progress")).toHaveText("2 / 2"); // 自動で次へ
  await page.getByRole("button", { name: "不正解（×）" }).click();
  await page.getByRole("button", { name: "採点を確定" }).click();

  await page
    .getByRole("button", { name: "間違えた問題を練習してからもう一度" })
    .click();
  await expect(page.getByTestId("practice-plan")).toBeVisible();
  await expect(page.getByTestId("progress")).toHaveText("1 / 2");
  await expect(page.getByTestId("practice-kanji")).toBeVisible();
  await page.getByRole("button", { name: "次の問題" }).click();
  await expect(page.getByTestId("progress")).toHaveText("2 / 2");
  await page.getByRole("button", { name: "練習を終えてもう一度解く" }).click();

  // 解き直しの回が始まる（間違えた2問）
  await expect(page.getByRole("button", { name: "中断" })).toBeVisible();
  await expect(page.getByTestId("progress")).toHaveText("1 / 2");
});

test("練習する範囲を回で絞れる", async ({ page }) => {
  await answerOne(page, false, "setup", 49);
  await answerOne(page, false, "setup", 50);
  await page.goto("/#/practice");
  await expect(page.getByTestId("progress")).toHaveText("1 / 2");
  await page.getByTestId("practice-range").locator("summary").click();
  const range = page.getByTestId("practice-range");
  await range.getByLabel("すべての回").uncheck(); // 0問になっても範囲の欄は開いたまま
  await expect(page.getByText("練習する問題はありません")).toBeVisible();
  await range.getByRole("button", { name: /第50回/ }).click();
  await expect(page.getByTestId("progress")).toHaveText("1 / 1");
});

test("復習画面から、練習してから復習を始められる", async ({ page }) => {
  await answerOne(page, false, "setup", 49);
  await page.goto("/#/review");
  await page.getByRole("button", { name: "練習してから復習する" }).click();
  await expect(page.getByTestId("practice-plan")).toHaveText(
    "これから復習する問題を練習してから、復習を始めます",
  );
  await expect(page.getByTestId("progress")).toHaveText("1 / 1");
  await expect(page.getByTestId("practice-kanji")).toBeVisible();
  await page.getByRole("button", { name: "練習を終えて復習を始める" }).click();

  // 復習の回が始まる
  await expect(page.getByRole("button", { name: "中断" })).toBeVisible();
  await expect(page.getByTestId("progress")).toHaveText("1 / 1");
});
