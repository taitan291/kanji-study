<script lang="ts">
  import { btn } from "../../components/buttons";
  import { DEFAULT_CONFIG } from "../../domain/config";
  import { daysBetween } from "../../domain/time";
  import { getLastExportAt } from "../../storage/meta";
  import { exportBackup } from "../../state/export";
  import { activeQuiz } from "../../state/active-quiz.svelte";
  import { history } from "../../state/history.svelte";
  import { router } from "../../state/router.svelte";
  import { isIOS, isStandalone, pwa } from "../../state/pwa.svelte";

  const INSTALL_HINT_KEY = "kanji-study:install-hint-dismissed";
  function shouldShowInstallHint() {
    try {
      return (
        isIOS() &&
        !isStandalone() &&
        localStorage.getItem(INSTALL_HINT_KEY) !== "1"
      );
    } catch {
      return false;
    }
  }
  let showInstallHint = $state(shouldShowInstallHint());
  function dismissInstallHint() {
    showInstallHint = false;
    try {
      localStorage.setItem(INSTALL_HINT_KEY, "1");
    } catch {
      // 保存できなくてもよい
    }
  }

  let lastExport = $state(getLastExportAt());
  const days = $derived(
    lastExport ? daysBetween(lastExport, new Date()) : null,
  );
  const warn = $derived(
    history.attempts.length > 0 &&
      (days === null || days >= DEFAULT_CONFIG.backupWarningDays),
  );

  async function doExport() {
    await exportBackup();
    lastExport = getLastExportAt();
  }
</script>

<div
  class="mx-auto max-w-2xl space-y-6 p-4 pt-[max(1rem,env(safe-area-inset-top))]"
>
  <header class="flex items-center justify-between">
    <h1 class="text-2xl font-bold">漢字の書き取り</h1>
    <a href="#/settings" class="text-stone-600 underline">設定</a>
  </header>

  {#if pwa.needRefresh}
    <div
      class="flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 p-4"
      role="status"
    >
      <p>新しい版があります。</p>
      <button class={btn.secondary} onclick={() => pwa.applyUpdate()}
        >更新する</button
      >
    </div>
  {/if}

  {#if showInstallHint}
    <div class="rounded-2xl border border-sky-300 bg-sky-50 p-4" role="note">
      <p class="mb-2">
        Safari の共有ボタンから<strong>「ホーム画面に追加」</strong
        >して、そこから開いて使ってください。
        ブラウザのまま使うと、7日間開かなかったときに記録が消えることがあります。
      </p>
      <button class={btn.small} onclick={dismissInstallHint}>閉じる</button>
    </div>
  {/if}

  {#if warn}
    <div
      class="rounded-2xl border border-amber-300 bg-amber-50 p-4"
      role="status"
    >
      <p class="mb-2">
        {days === null
          ? "まだJSONを書き出していません。"
          : `最後の書き出しから ${days} 日たちました。`}
        記録が消えたときのために、バックアップを書き出しましょう。
      </p>
      <button class={btn.secondary} onclick={doExport}>JSONを書き出す</button>
    </div>
  {/if}

  {#if activeQuiz.pending}
    <div class="rounded-2xl border border-sky-300 bg-sky-50 p-4" role="status">
      <p class="mb-2">
        途中の回（{activeQuiz.pending.quiz.questionIds.length} 問）があります。
      </p>
      <div class="flex gap-2">
        <button
          class={btn.primary}
          onclick={() => {
            activeQuiz.resumePending();
            router.go(activeQuiz.route);
          }}>続きから再開する</button
        >
        <button
          class={btn.secondary}
          onclick={() => activeQuiz.discardPending()}>破棄する</button
        >
      </div>
    </div>
  {/if}

  <div class="grid gap-3">
    <a href="#/setup" class="{btn.primary} min-h-16 text-xl">出題する</a>
    <a href="#/review" class="{btn.secondary} min-h-16 text-xl">
      復習する<span class="ml-2 text-base text-stone-500"
        >（{history.review.size}件）</span
      >
    </a>
    <a href="#/practice" class="{btn.secondary} min-h-14">練習する</a>
    <div class="grid grid-cols-2 gap-3">
      <a href="#/list" class="{btn.secondary} min-h-14">漢字一覧</a>
      <a href="#/stats" class="{btn.secondary} min-h-14">統計</a>
    </div>
  </div>

  <section class="rounded-2xl border border-stone-200 bg-white p-4">
    <h2 class="mb-2 font-bold">復習リスト</h2>
    <p>
      <span class="text-2xl font-bold" data-testid="review-count"
        >{history.review.size}</span
      >
      件
      {#if history.breakdown.length > 1}
        <span class="ml-2 text-sm text-stone-500">
          （連続正解 {history.breakdown
            .map((n, i) => `${i}回: ${n}`)
            .join(" / ")}）
        </span>
      {/if}
    </p>
  </section>

  <section class="text-sm text-stone-600">
    <p>これまでの解答: {history.attempts.length} 問</p>
    {#if lastExport}<p>
        最後の書き出し: {lastExport.toLocaleString("ja-JP")}
      </p>{/if}
  </section>
</div>
