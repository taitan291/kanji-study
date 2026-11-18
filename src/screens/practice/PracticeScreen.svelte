<script lang="ts">
  import FuruText from "../../components/FuruText.svelte";
  import AnswerLayout from "../../components/layout/AnswerLayout.svelte";
  import { btn } from "../../components/buttons";
  import { inkShortcut, shouldIgnoreKey } from "../../components/keys";
  import {
    practiceQuestions,
    type PracticeSource,
  } from "../../domain/practice";
  import {
    allRoundsRange,
    describeRange,
    resolveRange,
  } from "../../domain/range";
  import { shuffle } from "../../domain/random";
  import type { RangeSpec } from "../../domain/types";
  import RangePicker from "../setup/RangePicker.svelte";
  import HandwritingCanvas from "../../handwriting/HandwritingCanvas.svelte";
  import {
    ERASER_WIDTH,
    PEN_WIDTHS,
    canUndo,
    clearAll,
    redoStep,
    undoStep,
    type Op,
    type Tool,
  } from "../../handwriting/strokes";
  import { onDestroy } from "svelte";
  import { history } from "../../state/history.svelte";
  import { launcher } from "../../state/launcher.svelte";
  import { practicePlan } from "../../state/practice-plan.svelte";
  import { questions } from "../../state/questions.svelte";
  import { settings } from "../../state/settings.svelte";
  import ToolBar from "../answer/ToolBar.svelte";

  /**
   * 練習。例文と正しい漢字を見ながら書く。漢字は隠したり出したりできる。
   * 対象は復習リスト・間違えたことがある全部・すべての問題から選ぶ。
   * 採点も記録もしないので、復習リストや統計は変わらない。手書きも保存しない。
   * 結果画面・復習画面から来たとき（practicePlan がある）は、予定の問題だけを練習し、最後にその回を始める。
   */
  let source = $state<PracticeSource>("review");
  let shuffled = $state(false);
  let seed = $state(0);
  let hidden = $state(false);
  let index = $state(0);
  let tool = $state<Tool>("pen");
  // 問題ごとの手書きとやり直しの列（この画面の中だけ）
  let inks = $state.raw<Record<string, Op[]>>({});
  let redos = $state.raw<Record<string, Op[]>>({});

  const stats = $derived(history.stats(questions.list).byQuestion);
  const reviewList = $derived(
    practiceQuestions(questions.list, history.review, stats, "review"),
  );
  const missedList = $derived(
    practiceQuestions(questions.list, history.review, stats, "missed"),
  );
  const allList = $derived(
    practiceQuestions(questions.list, history.review, stats, "all"),
  );
  // 結果画面から来たときの予定（画面を開いたときのものを使い、離れたら消す）
  const plan = practicePlan.current;
  onDestroy(() => practicePlan.clear());
  const planList = plan
    ? plan.questionIds
        .map((id) => questions.get(id))
        .filter((q) => q !== undefined)
    : [];

  async function finishAndRetry() {
    if (!plan) return;
    await launcher.launch(
      plan.retry.questionIds,
      plan.retry.mode,
      plan.retry.range,
    );
  }

  // 範囲。null は「すべての回」（対象を切り替えたら戻す）
  let chosen = $state.raw<RangeSpec | null>(null);
  let rangeOpen = $state(false);
  const sourceList = $derived(
    source === "review"
      ? reviewList
      : source === "missed"
        ? missedList
        : allList,
  );
  const range = $derived(chosen ?? allRoundsRange(sourceList));

  const list = $derived.by(() => {
    if (plan) return planList;
    const ids = new Set(resolveRange(sourceList, range));
    const base = sourceList.filter((q) => ids.has(q.id));
    if (!shuffled) return base;
    void seed;
    return shuffle(base, Math.random);
  });
  const question = $derived(list[Math.min(index, list.length - 1)]);
  const ops = $derived(question ? (inks[question.id] ?? []) : []);
  const redo = $derived(question ? (redos[question.id] ?? []) : []);

  function setInk(next: Op[], nextRedo: Op[] = []) {
    if (!question) return;
    inks = { ...inks, [question.id]: next };
    redos = { ...redos, [question.id]: nextRedo };
  }
  function undoInk() {
    const h = undoStep(ops, redo);
    setInk(h.ops, h.redo);
  }
  function redoInk() {
    const h = redoStep(ops, redo);
    setInk(h.ops, h.redo);
  }
  function goTo(i: number) {
    if (i >= 0 && i < list.length) index = i;
  }
  function changeList(apply: () => void) {
    apply();
    index = 0;
  }

  function onKey(e: KeyboardEvent) {
    if (shouldIgnoreKey(e, { allowModifiers: true })) return;
    const shortcut = inkShortcut(e);
    if (shortcut) {
      e.preventDefault();
      if (shortcut === "undo") undoInk();
      else redoInk();
    } else if (e.ctrlKey || e.metaKey || e.altKey) {
      return;
    } else if (e.key === "ArrowRight") goTo(index + 1);
    else if (e.key === "ArrowLeft") goTo(index - 1);
    else if (e.key.toLowerCase() === "h") hidden = !hidden;
    else if (e.key.toLowerCase() === "e")
      tool = tool === "pen" ? "eraser" : "pen";
  }
</script>

<svelte:window onkeydown={onKey} />

{#snippet sourcePicker()}
  <div
    class="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm"
    data-testid="practice-source"
  >
    <select
      class="min-h-9 rounded-lg border border-stone-300 bg-white px-2"
      aria-label="練習する問題"
      value={source}
      onchange={(e) =>
        changeList(() => {
          source = e.currentTarget.value as PracticeSource;
          chosen = null;
        })}
    >
      <option value="review">復習リスト（{reviewList.length}問）</option>
      <option value="missed"
        >間違えたことがある全部（{missedList.length}問）</option
      >
      <option value="all">すべての問題（{allList.length}問）</option>
    </select>
    <label class="flex min-h-9 items-center gap-1.5">
      <input
        type="checkbox"
        class="size-4"
        checked={shuffled}
        onchange={(e) =>
          changeList(() => {
            shuffled = e.currentTarget.checked;
            seed++;
          })}
      />
      順番をばらばらに
    </label>
  </div>
  <details class="text-sm" data-testid="practice-range" bind:open={rangeOpen}>
    <summary class="min-h-9 cursor-pointer py-1">
      範囲: {describeRange(range)}（{list.length}問）
    </summary>
    <div class="mt-2 rounded-xl border border-stone-200 bg-white p-3">
      <RangePicker
        questions={sourceList}
        {range}
        onchange={(r) => changeList(() => (chosen = r))}
      />
    </div>
  </details>
{/snippet}

{#if question}
  <AnswerLayout>
    {#snippet header()}
      <div class="space-y-1">
        <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
          <a href="#/" class={btn.small}>戻る</a>
          <h1 class="font-bold [@media(max-height:500px)]:hidden">練習</h1>
          <span class="text-lg font-bold" data-testid="progress"
            >{index + 1} / {list.length}</span
          >
          <span class="text-sm text-stone-500"
            >第{question.round}回 {question.number}番</span
          >
        </div>
        {#if plan}
          <p class="text-sm text-stone-600" data-testid="practice-plan">
            {plan.kind === "review"
              ? "これから復習する問題を練習してから、復習を始めます"
              : "この回で間違えた問題を練習してから、もう一度解きます"}
          </p>
        {:else}
          {@render sourcePicker()}
        {/if}
      </div>
    {/snippet}
    {#snippet tools()}
      <ToolBar
        {tool}
        canUndo={canUndo(ops)}
        canRedo={redo.length > 0}
        onTool={(t) => (tool = t)}
        onUndo={undoInk}
        onRedo={redoInk}
        onClear={() => setInk(clearAll(ops))}
      />
    {/snippet}
    {#snippet text()}
      <div class="flex h-full gap-3 rounded-2xl bg-white p-4">
        <div class="flex min-w-0 flex-1 flex-col gap-2">
          <FuruText
            furu={question.furu}
            yomi={question.yomi}
            vertical
            class="min-h-0 flex-1 text-2xl md:text-3xl [@media(max-height:500px)]:text-lg"
          />
          <p class="text-sm text-stone-500">{question.imi}</p>
        </div>
        <div
          class="flex shrink-0 flex-col items-center justify-between gap-2 border-l border-stone-200 pl-3"
        >
          {#if hidden}
            <p
              class="flex min-h-0 flex-1 items-center justify-center rounded-lg bg-stone-100 px-3 text-stone-400 [writing-mode:vertical-rl]"
              data-testid="practice-kanji-hidden"
            >
              かくしています
            </p>
          {:else}
            <p
              class="min-h-0 flex-1 font-serif text-5xl leading-tight font-bold [writing-mode:vertical-rl] md:text-6xl [@media(max-height:500px)]:text-3xl"
              data-testid="practice-kanji"
            >
              {question.kanji}
            </p>
          {/if}
          <button
            class="{btn.small} text-sm whitespace-nowrap"
            aria-pressed={hidden}
            onclick={() => (hidden = !hidden)}
            >{hidden ? "漢字を見る" : "漢字を隠す"}</button
          >
        </div>
      </div>
    {/snippet}
    {#snippet canvas()}
      {#key question.id}
        <HandwritingCanvas
          {ops}
          {tool}
          width={tool === "pen"
            ? PEN_WIDTHS[settings.value.penWidth]
            : ERASER_WIDTH}
          penOnly={settings.value.penOnly}
          onchange={(o) => setInk(o)}
          label="{question.kanji}の練習欄"
        />
      {/key}
    {/snippet}
    {#snippet nav()}
      <div class="flex items-center justify-between gap-2">
        <button
          class={btn.secondary}
          disabled={index === 0}
          onclick={() => goTo(index - 1)}>前の問題</button
        >
        {#if plan && index >= list.length - 1}
          <button class={btn.primary} onclick={finishAndRetry}
            >{plan.kind === "review"
              ? "練習を終えて復習を始める"
              : "練習を終えてもう一度解く"}</button
          >
        {:else}
          <button
            class={btn.primary}
            disabled={index >= list.length - 1}
            onclick={() => goTo(index + 1)}>次の問題</button
          >
        {/if}
      </div>
    {/snippet}
  </AnswerLayout>
{:else}
  <div class="mx-auto max-w-2xl space-y-4 p-4">
    <header class="flex items-center gap-3">
      <a href="#/" class="text-stone-500 underline">戻る</a>
      <h1 class="text-xl font-bold">練習</h1>
    </header>
    {@render sourcePicker()}
    <p class="text-stone-600">
      練習する問題はありません。復習リストと「間違えたことがある全部」には×が付いた問題が入ります。「すべての問題」を選ぶと、まだ間違えていない問題も練習できます。
    </p>
  </div>
{/if}
