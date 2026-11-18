/**
 * 問題データ（教材をもとにした非公開データ）を public/data/questions.json に用意する。
 * 本物は非公開リポジトリ taitan291/kanji-study-dict にあり、このリポジトリには入れない。
 *
 * 取ってくる先（上から順に試す）:
 *   1. KANJI_DATA_DIR  … 手元に clone した kanji-study-dict のフォルダー
 *   2. KANJI_DATA_TAKEN … GitHub のトークン（kanji-study-dict の Contents を読めるもの）
 *   3. すでに public/data/questions.json がある … そのまま使う（手元で一度取ったもの）
 *   4. どれもない … 見本データ（example.json、自作の129問）を使う
 *
 * Cloudflare Pages の本番ビルド（main）で本物が取れないときは、見本のまま公開しないよう失敗させる。
 */
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const OUT = "public/data/questions.json";
const SAMPLE = "example.json";
const repo = process.env.KANJI_DATA_REPO ?? "taitan291/kanji-study-dict";
const ref = process.env.KANJI_DATA_REF ?? "main";
const file = process.env.KANJI_DATA_PATH ?? "questions.json";
const isProduction =
  process.env.CF_PAGES === "1" && process.env.CF_PAGES_BRANCH === "main";

function fail(message: string): never {
  console.error(`fetch-questions: ${message}`);
  process.exit(1);
}

mkdirSync(dirname(OUT), { recursive: true });

const dir = process.env.KANJI_DATA_DIR;
const token = process.env.KANJI_DATA_TAKEN;

if (dir) {
  const src = join(dir, file);
  if (!existsSync(src)) fail(`${src} がありません`);
  copyFileSync(src, OUT);
  console.log(`fetch-questions: ${src} をコピーしました`);
} else if (token) {
  const url = `https://api.github.com/repos/${repo}/contents/${file}?ref=${encodeURIComponent(ref)}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.raw+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "kanji-build",
    },
  });
  if (!res.ok) {
    fail(
      `${repo} の ${file} を取得できません（HTTP ${res.status}）。KANJI_DATA_TAKEN の権限と期限を確認してください`,
    );
  }
  writeFileSync(OUT, await res.text());
  console.log(`fetch-questions: ${repo}@${ref} の ${file} を取得しました`);
} else if (isProduction) {
  fail(
    "本番ビルドなのに KANJI_DATA_TAKEN がありません。Cloudflare Pages の変数とシークレットに設定してください",
  );
} else if (existsSync(OUT)) {
  console.log(`fetch-questions: 既存の ${OUT} を使います`);
} else {
  copyFileSync(SAMPLE, OUT);
  console.log(`fetch-questions: 本物のデータがないので見本データを使います`);
}
