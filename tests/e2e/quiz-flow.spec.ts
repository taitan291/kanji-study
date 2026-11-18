import { expect, test, type Page } from "@playwright/test";
import { answerOne, drawOn, inkPixels, selectOnlyRound } from "./helpers";

async function startThreeQuestions(page: Page) {
  await page.goto("/");
  await page.getByRole("link", { name: "出題する" }).click();
  await selectOnlyRound(page, 49);
  await expect(page.getByTestId("range-count")).toHaveText("22");
  await page.getByLabel("自由に決める").check();
  await page.getByLabel("問題数").fill("3");
  await page.getByRole("button", { name: "3 問で始める" }).click();
  await expect(page.getByTestId("progress")).toHaveText("1 / 3");
}

test("出題 → 手書き → ○× → 確定 → 間違えた問題だけもう一度", async ({
  page,
}) => {
  await startThreeQuestions(page);
  await expect(page.locator("strong").first()).toBeVisible(); // 太字の読み

  await drawOn(page);
  await page.getByRole("button", { name: "次の問題" }).click();
  await drawOn(page);
  await page.getByRole("button", { name: "次の問題" }).click();
  await expect(page.getByTestId("progress")).toHaveText("3 / 3");

  // 前の問題に戻っても書いた内容が残る
  await page.getByRole("button", { name: "前の問題" }).click();
  await expect.poll(() => inkPixels(page)).toBeGreaterThan(50);
  await page.getByRole("button", { name: "次の問題" }).click();

  // 未記入があると確認が出る
  await page.getByRole("button", { name: "採点へ進む" }).click();
  await expect(page.getByRole("dialog")).toContainText("3問目");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "採点へ進む" })
    .click();

  await expect(page.getByRole("heading", { name: "自己採点" })).toBeVisible();
  await expect(page.getByTestId("correct-kanji")).toBeVisible();
  const confirmBtn = page.getByRole("button", { name: "採点を確定" });
  await page.getByRole("button", { name: "正解（○）" }).click();
  await page.getByRole("button", { name: "不正解（×）" }).click();
  await expect(confirmBtn).toBeDisabled();
  await page.getByRole("button", { name: "正解（○）" }).click();
  await confirmBtn.click();

  await expect(page.getByTestId("score")).toContainText("2");
  await expect(page.getByTestId("score")).toContainText("/ 3 問");
  await page.getByRole("button", { name: "練習せずにもう一度" }).click();
  await expect(page.getByTestId("progress")).toHaveText("1 / 1");

  // 解答記録が増え、復習リストに1件入っている
  await page.getByRole("button", { name: "中断" }).click();
  await page.getByRole("button", { name: "破棄する" }).click();
  await expect(page.getByTestId("review-count")).toHaveText("1");
  await expect(page.getByText("これまでの解答: 3 問")).toBeVisible();
});

test("解答中に再読み込みしても手書きと位置が残り、再開できる", async ({
  page,
}) => {
  await startThreeQuestions(page);
  await page.getByRole("button", { name: "次の問題" }).click();
  await drawOn(page);
  await page.waitForTimeout(800); // 自動保存（0.5秒後）を待つ
  await page.reload();

  await expect(page.getByRole("status")).toContainText("途中の回");
  await page.getByRole("button", { name: "続きから再開する" }).click();
  await expect(page.getByTestId("progress")).toHaveText("2 / 3");
  await expect.poll(() => inkPixels(page)).toBeGreaterThan(50);
});

test("回の選択は最初からすべてオンで、まとめてオン・オフできる。問題数は前回の値", async ({
  page,
}) => {
  await startThreeQuestions(page);
  await page.getByRole("button", { name: "中断" }).click();
  await page.getByRole("button", { name: "破棄する" }).click();
  await page.getByRole("link", { name: "出題する" }).click();
  const all = page.getByLabel("すべての回");
  await expect(all).toBeChecked();
  await expect(page.getByTestId("range-count")).toHaveText("129");
  await expect(page.getByLabel("問題数")).toHaveValue("3");

  await all.uncheck();
  await expect(page.getByTestId("range-count")).toHaveText("0");
  await page.getByRole("button", { name: /第50回/ }).click();
  await expect(all).not.toBeChecked();
  await all.check();
  await expect(page.getByTestId("range-count")).toHaveText("129");
});

test("問題数: すべて、対象より多い自由な数は対象の数だけ出す", async ({
  page,
}) => {
  await page.goto("/#/setup");
  await selectOnlyRound(page, 49);
  await page.getByRole("radio", { name: /^すべて/ }).check();
  await expect(
    page.getByRole("button", { name: "22 問で始める" }),
  ).toBeVisible();
  await page.getByLabel("自由に決める").check();
  await page.getByLabel("問題数").fill("100");
  await expect(page.getByText("22 問（全部）を出します")).toBeVisible();
  await page.getByRole("button", { name: "22 問で始める" }).click();
  await expect(page.getByTestId("progress")).toHaveText("1 / 22");
});

test("間違えた問題・まだ解いていない問題を優先する切り替え", async ({
  page,
}) => {
  await answerOne(page, false, "setup", 49);
  await page.goto("/#/setup");
  await selectOnlyRound(page, 49);
  await expect(page.getByTestId("priority-count")).toContainText(
    "最後に間違えた問題 1 問・まだ解いていない問題 21 問",
  );
  const wrong = page.getByRole("switch", { name: "間違えた問題を優先" });
  const unanswered = page.getByRole("switch", {
    name: "まだ解いていない問題を優先",
  });
  await expect(wrong).toHaveAttribute("aria-checked", "false");
  await expect(unanswered).toHaveAttribute("aria-checked", "false");
  await wrong.click();
  await expect(wrong).toHaveAttribute("aria-checked", "true");
  await expect(unanswered).toHaveAttribute("aria-checked", "false");
  await page.getByRole("radio", { name: "5問" }).check();
  await page.getByRole("button", { name: "5 問で始める" }).click();
  await expect(page.getByTestId("progress")).toHaveText("1 / 5");

  // 次に開いたときも、それぞれの状態のまま
  await page.goto("/#/setup");
  await expect(wrong).toHaveAttribute("aria-checked", "true");
  await expect(unanswered).toHaveAttribute("aria-checked", "false");
});
