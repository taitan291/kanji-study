<script lang="ts">
  import CountPicker from "../../components/CountPicker.svelte";
  import { btn } from "../../components/buttons";
  import { pickReview, resolveCount } from "../../domain/picker";
  import {
    allRoundsRange,
    describeRange,
    resolveRange,
  } from "../../domain/range";
  import type { RangeSpec } from "../../domain/types";
  import { questions } from "../../state/questions.svelte";
  import RangePicker from "../setup/RangePicker.svelte";
  import { history } from "../../state/history.svelte";
  import { launcher } from "../../state/launcher.svelte";
  import { practicePlan } from "../../state/practice-plan.svelte";
  import { router } from "../../state/router.svelte";
  import { settings } from "../../state/settings.svelte";

  /** 復習の出題（仕様書 6.3）。連続正解の少ないもの、間違いの多いものを優先 */
  let wanted = $state(settings.value.lastCount);
  const allEntries = $derived([...history.review.values()]);
  // 復習リストにある問題（範囲の選択肢はこの中の回だけ）
  const reviewQuestions = $derived(
    questions.list.filter((q) => history.review.has(q.id)),
  );
  // 範囲。null は「すべての回」
  let chosen = $state.raw<RangeSpec | null>(null);
  const range = $derived(chosen ?? allRoundsRange(reviewQuestions));
  const inRange = $derived(new Set(resolveRange(reviewQuestions, range)));
  const entries = $derived(allEntries.filter((e) => inRange.has(e.questionId)));
  const count = $derived(resolveCount(wanted, entries.length));

  async function start() {
    if (count === 0) return;
    await launcher.launch(
      pickReview(entries, count, Math.random),
      "review",
      range,
    );
  }

  /** これから復習する問題を、見ながら書いて練習してから復習を始める */
  function practiceThenStart() {
    if (count === 0) return;
    const ids = pickReview(entries, count, Math.random);
    const picked = new Set(ids);
    practicePlan.set({
      kind: "review",
      // 練習は問題の並び順、復習はばらばらの順で出す
      questionIds: questions.list
        .filter((q) => picked.has(q.id))
        .map((q) => q.id),
      retry: { questionIds: ids, mode: "review", range },
    });
    router.go("practice");
  }
</script>

<div class="mx-auto max-w-2xl space-y-6 p-4">
  <header class="flex items-center gap-3">
    <a href="#/" class="text-stone-500 underline">戻る</a>
    <h1 class="text-xl font-bold">復習する</h1>
  </header>

  <section class="rounded-2xl border border-stone-200 bg-white p-4">
    <p class="mb-1">
      復習リスト: <strong>{allEntries.length}</strong> 件
    </p>
    {#if history.breakdown.length > 1}
      <p class="text-sm text-stone-500">
        {history.breakdown
          .map((n, i) => `連続正解 ${i}回: ${n}件`)
          .join(" ／ ")}
      </p>
      <p class="mt-2 text-sm text-stone-500">
        別々の回で {history.breakdown.length} 回続けて正解すると、リストから外れます。
      </p>
    {:else}
      <p class="mt-2 text-sm text-stone-500">
        次に正解すると、リストから外れます。
      </p>
    {/if}
    <a href="#/practice" class="mt-3 inline-block underline"
      >採点せずに、見ながら書いて練習する</a
    >
  </section>

  {#if allEntries.length}
    <section class="rounded-2xl border border-stone-200 bg-white p-4">
      <h2 class="mb-3 text-lg font-bold">復習する範囲</h2>
      <RangePicker
        questions={reviewQuestions}
        {range}
        onchange={(r) => (chosen = r)}
      />
      <p class="mt-4 text-stone-600">
        範囲: {describeRange(range)} ／
        <strong data-testid="range-count">{entries.length}</strong> 問
      </p>
    </section>
    <section class="rounded-2xl border border-stone-200 bg-white p-4">
      <h2 class="mb-3 text-lg font-bold">問題数</h2>
      <CountPicker
        value={wanted}
        max={entries.length}
        onchange={(n) => (wanted = n)}
      />
    </section>
    <div class="flex flex-wrap justify-end gap-2">
      <button
        class={btn.secondary}
        disabled={count === 0}
        onclick={practiceThenStart}>練習してから復習する</button
      >
      <button class={btn.primary} disabled={count === 0} onclick={start}
        >{count} 問で復習を始める</button
      >
    </div>
  {:else}
    <p class="text-stone-600">
      復習する問題はありません。×が付いた問題がここに入ります。
    </p>
  {/if}
</div>
