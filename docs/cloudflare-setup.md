# Cloudflare Pages の設定手順（本人が行う作業）

## 1. Pages プロジェクトを作る

> **注意**: いまのダッシュボードでは、最初に出る「アプリケーションを作成」の流れで進むと **Workers** のプロジェクトになります（「Deploy command: `npx wrangler deploy`」の欄がある画面）。このサイトは **Pages**（Pages Functions でログインを行う）なので、その画面では進めず **Back** で戻ってください。

1. Cloudflare のダッシュボード → **Workers & Pages** → **作成** → **Pages** タブ（または画面下の「Pages を使いたい場合はこちら」）→ **既存の Git リポジトリをインポート**（Git に接続）
2. GitHub の `taitan291/kanji-study` を選ぶ（Cloudflare の GitHub アプリにこのリポジトリへのアクセスを許可する）
3. ビルドの設定:
   - フレームワーク プリセット: なし
   - ビルドコマンド: `npm run build`
   - ビルド出力ディレクトリ: `dist`
   - 本番ブランチ: `main`
   - Node.js のバージョンはリポジトリの `.nvmrc`（22）が使われるので、設定は不要
   - 「デプロイコマンド」の欄が出たら、それは Workers の画面です（上の注意を参照）

## 2. ログイン用のシークレットを設定する

**設定** → **変数とシークレット** で、**本番とプレビューの両方**に次の3つを「暗号化（シークレット）」で追加します。

| 名前 | 値 |
| --- | --- |
| `AUTH_USER` | ログインのユーザー名 |
| `AUTH_PASSWORD` | ログインのパスワード（長めのもの） |
| `AUTH_SECRET` | Cookie 署名用のランダムな文字列。例: `openssl rand -base64 32` の出力 |
| `KANJI_DATA_TOKEN` | 問題データ（非公開リポジトリ `taitan291/kanji-study-dict`）を読むための GitHub トークン。下の 2.1 を参照 |

- 3つのどれかが無いと、誰もログインできません（安全側に倒しています）。
- 追加・変更したあとは、**デプロイをやり直す**と反映されます（**デプロイ** → 最新のもの → **再試行**）。
- パスワードを変えたいとき: `AUTH_PASSWORD` を変えて再デプロイ。
- 全端末のログインを一度に無効にしたいとき（端末をなくしたときなど）: `AUTH_SECRET` を変えて再デプロイ。

### 2.1 問題データ用のトークン（`KANJI_DATA_TOKEN`）

問題データは教材をもとにしているので、公開リポジトリには入れず `taitan291/kanji-study-dict`（非公開）に置いています。ビルドのとき `scripts/fetch-questions.ts` がこのトークンで取ってきます。

1. GitHub → Settings → Developer settings → **Personal access tokens** → **Fine-grained tokens** → **Generate new token**
2. Repository access: **Only select repositories** → `taitan291/kanji-study-dict`
3. Permissions: **Contents: Read-only**（ほかは付けない）
4. 期限を決めて作り、表示された値を Cloudflare の `KANJI_DATA_TOKEN` に貼る（本番とプレビューの両方）
5. 期限が切れると本番ビルドが失敗します。そのときは作り直して値を入れ替え、再デプロイします。

### 2.2 問題を足したら自動で作り直す（Deploy Hook）

1. Pages プロジェクト → **設定** → **ビルド** → **デプロイフック** → **追加**（名前は `kanji-study-dict`、ブランチは `main`）
2. 表示された URL を、GitHub の `taitan291/kanji-study-dict` → Settings → Secrets and variables → Actions に `CF_DEPLOY_HOOK_URL` という名前で追加する

## 3. 独自ドメイン `kanji.taitan.uk`

1. Pages プロジェクト → **カスタムドメイン** → **カスタムドメインを設定** → `kanji.taitan.uk`
2. `taitan.uk` の DNS が Cloudflare にあれば、CNAME は自動で作られます。

## 4. 確認

- `https://kanji.taitan.uk/` を開くとログイン画面に転送される
- `https://kanji.taitan.uk/data/questions.json` をログインなしで開くと 401
- `*.pages.dev` の URL と、PR ごとのプレビュー URL でもログインが出る
- ビルドのログに「kanji-study-dict@main の questions.json を取得しました」と出る（「見本データを使います」ではない）
