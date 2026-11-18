import { test } from "@playwright/test";
import { drawOn } from "./helpers";

/**
 * 画面写真（設計計画書 フェーズ8）。iPad・iPhone の縦横で撮って test-results/screens/ に保存する。
 * 見比べるためのもので、合否は判定しない。
 */
const sizes = {
  "ipad-portrait": { width: 810, height: 1080 },
  "ipad-landscape": { width: 1080, height: 810 },
  "iphone-portrait": { width: 390, height: 844 },
  "iphone-landscape": { width: 844, height: 390 },
};

test.describe("画面写真", () => {
  test.skip(({ isMobile }) => isMobile, "大きさは各テストで指定する");

  for (const [name, viewport] of Object.entries(sizes)) {
    test(name, async ({ page }) => {
      await page.setViewportSize(viewport);
      const shot = (screen: string) =>
        page.screenshot({ path: `test-results/screens/${name}-${screen}.png` });
      await page.goto("/");
      await shot("home");
      await page.getByRole("link", { name: "出題する" }).click();
      await page.getByRole("button", { name: /第49回/ }).click();
      await page.getByLabel("自由に決める").check();
      await page.getByLabel("問題数").fill("1");
      await shot("setup");
      await page.getByRole("button", { name: "1 問で始める" }).click();
      await drawOn(page);
      await shot("answer");
      await page.getByRole("button", { name: "採点へ進む" }).click();
      await page.getByRole("button", { name: "正解（○）" }).click();
      await shot("grading");
      await page.getByRole("button", { name: "採点を確定" }).click();
      await shot("result");
      await page.goto("/#/stats");
      await shot("stats");
      await page.goto("/#/list");
      await page.getByTestId("kanji-card").first().click();
      await shot("list");
    });
  }
});
