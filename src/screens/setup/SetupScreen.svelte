<script lang="ts">
  import CountPicker from "../../components/CountPicker.svelte";
  import { btn } from "../../components/buttons";
  import {
    pickPrioritized,
    pickRandom,
    priorityIds,
    resolveCount,
  } from "../../domain/picker";
  import {
    allRoundsRange,
    describeRange,
    resolveRange,
  } from "../../domain/range";
  import type { RangeSpec } from "../../domain/types";
  import { latestResults } from "../../domain/review";
  import { history } from "../../state/history.svelte";
  import { launcher } from "../../state/launcher.svelte";
  import { questions } from "../../state/questions.svelte";
  import { settings } from "../../state/settings.svelte";
  import RangePicker from "./RangePicker.svelte";

  // 回の選択は、開くたびに「すべての回」から始める。null は「すべての回」
  let chosen = $state.raw<RangeSpec | null>(null);
  const range = $derived(chosen ?? allRoundsRange(questions.list));
  let wanted = $state(settings.value.lastCount);

  const ids = $derived(resolveRange(questions.list, range));
  const count = $derived(resolveCount(wanted, ids.length));

  // 最後の解答が × の問題・まだ解いていない問題を、それぞれ優先できる
  let prioritizeWrong = $state(settings.value.prioritizeWrong);
  let prioritizeUnanswered = $state(settings.value.prioritizeUnanswered);
  const latest = $derived(latestResults(history.attempts));
  const priority = $derived(priorityIds(ids, latest));
  const prioritySet = $derived(
    new Set([
      ...(prioritizeWrong ? priority.wrong : []),
      ...(prioritizeUnanswered ? priority.unanswered : []),
    ]),
  );
  const anyPriority = $derived(prioritizeWrong || prioritizeUnanswered);

  async function start() {
    if (count === 0) return;
    const snapshot = structuredClone(range);
    settings.update({
      lastRange: snapshot,
      lastCount: wanted,
      prioritizeWrong,
      prioritizeUnanswered,
    });
    const picked = anyPriority
      ? pickPrioritized(ids, count, prioritySet, Math.random)
      : pickRandom(ids, count, Math.random);
    await launcher.launch(picked, "normal", snapshot);
  }
</script>

<div class="mx-auto max-w-3xl space-y-6 p-4 pb-24">
  <header class="flex items-center gap-3">
    <a href="#/" class="text-stone-500 underline">戻る</a>
    <h1 class="text-xl font-bold">出題の設定</h1>
  </header>

  <section class="rounded-2xl border border-stone-200 bg-white p-4">
    <h2 class="mb-3 text-lg font-bold">出題範囲</h2>
    <RangePicker
      questions={questions.list}
      {range}
      onchange={(r) => (chosen = r)}
    />
    <p class="mt-4 text-stone-600">
      範囲: {describeRange(range)} ／
      <strong data-testid="range-count">{ids.length}</strong> 問
    </p>
  </section>

  <section class="rounded-2xl border border-stone-200 bg-white p-4">
    <h2 class="mb-3 text-lg font-bold">問題数</h2>
    <CountPicker
      value={wanted}
      max={ids.length}
      onchange={(n) => (wanted = n)}
    />
  </section>

  <section class="rounded-2xl border border-stone-200 bg-white p-4">
    <h2 class="mb-3 text-lg font-bold">出し方</h2>
    {#snippet toggle(on: boolean, label: string, flip: () => void)}
      <button
        type="button"
        role="switch"
        aria-checked={on}
        class="flex min-h-11 items-center gap-3 text-left"
        onclick={flip}
      >
        <span
          class="relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors {on
            ? 'bg-stone-900'
            : 'bg-stone-300'}"
          aria-hidden="true"
          ><span
            class="absolute top-1 size-5 rounded-full bg-white transition-all {on
              ? 'left-6'
              : 'left-1'}"
          ></span></span
        >
        <span>{label}</span>
      </button>
    {/snippet}
    <div class="space-y-1">
      {@render toggle(
        prioritizeWrong,
        "間違えた問題を優先",
        () => (prioritizeWrong = !prioritizeWrong),
      )}
      {@render toggle(
        prioritizeUnanswered,
        "まだ解いていない問題を優先",
        () => (prioritizeUnanswered = !prioritizeUnanswered),
      )}
    </div>
    <p class="mt-2 text-sm text-stone-500" data-testid="priority-count">
      範囲の中で、最後に間違えた問題 {priority.wrong.length} 問・まだ解いていない問題
      {priority.unanswered.length} 問。{anyPriority
        ? "オンにした問題から先に選び、足りない分は残りから選びます。"
        : "オフのときは範囲の中から均等に選びます。"}
    </p>
  </section>

  <div class="flex justify-end">
    <button class={btn.primary} disabled={count === 0} onclick={() => start()}>
      {count} 問で始める
    </button>
  </div>
</div>
