import { expect, test } from "@playwright/test";
import { answerOne } from "./helpers";

test("漢字一覧で、回ごとの漢字を見て、例文と意味を開ける", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "漢字一覧" }).click();
  await expect(page.getByRole("heading", { name: "漢字一覧" })).toBeVisible();
  await expect(page.getByTestId("list-count")).toHaveText("129 問");
  await expect(page.getByRole("heading", { name: /第49回/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /第54回/ })).toBeVisible();

  const first = page.getByTestId("kanji-card").first();
  await expect(first.getByTestId("kanji")).toHaveText("学校");
  await expect(first.getByTestId("kanji-detail")).toBeHidden();
  await first.getByRole("button").click();
  await expect(first.getByTestId("furu")).toContainText("ガッコウ");
  await expect(first.getByTestId("imi")).toBeVisible();
  await first.getByRole("button").click();
  await expect(first.getByTestId("kanji-detail")).toBeHidden();

  await page.getByRole("button", { name: "例文と意味をすべて開く" }).click();
  await expect(page.getByTestId("kanji-detail")).toHaveCount(129);
  await page.getByRole("button", { name: "例文と意味を閉じる" }).click();
  await expect(page.getByTestId("kanji-detail")).toHaveCount(0);
});

test("漢字一覧を回と文字で絞り込み、漢字を隠せる", async ({ page }) => {
  await page.goto("/#/list");
  await page.getByLabel("回で絞り込む").selectOption("50");
  await expect(page.getByRole("heading", { name: /第49回/ })).toBeHidden();
  await expect(page.getByRole("heading", { name: /第50回/ })).toBeVisible();

  await page.getByLabel("回で絞り込む").selectOption({ label: "すべての回" });
  await page.getByLabel("漢字・読み・例文・意味で探す").fill("がっこう");
  await expect(page.getByTestId("kanji-card")).toHaveCount(1);
  await expect(page.getByTestId("list-count")).toHaveText("1 / 129 問");
  await page.getByRole("button", { name: "絞り込みを外す" }).click();
  await expect(page.getByTestId("kanji-card")).toHaveCount(129);

  await page.getByRole("button", { name: "漢字を隠す" }).click();
  await expect(page.getByTestId("kanji")).toHaveCount(0);
  const first = page.getByTestId("kanji-card").first();
  await first.getByRole("button").click();
  await expect(first.getByTestId("kanji")).toHaveText("学校");
  await page.getByRole("button", { name: "漢字を見る" }).click();
  await expect(page.getByTestId("kanji")).toHaveCount(129);
});

test("漢字一覧で、復習リストにある漢字に印がつく", async ({ page }) => {
  await answerOne(page, false, "setup", 49);
  await page.goto("/#/list");
  await expect(
    page.getByTestId("kanji-card").filter({ hasText: "復習" }),
  ).toHaveCount(1);
});

test("漢字一覧で絞り込んだ問題だけで出題できる", async ({ page }) => {
  await page.goto("/#/list");
  await page.getByLabel("漢字・読み・例文・意味で探す").fill("がっこう");
  await page.getByRole("button", { name: "1 問で出題する" }).click();
  await expect(page.getByRole("button", { name: "採点へ進む" })).toBeVisible();
});
