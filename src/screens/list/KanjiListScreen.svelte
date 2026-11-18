<script lang="ts">
  import { SvelteSet } from "svelte/reactivity";
  import FuruText from "../../components/FuruText.svelte";
  import { btn } from "../../components/buttons";
  import {
    NO_LIST_FILTER,
    filterKanjiList,
    groupByRound,
    type KanjiListFilter,
  } from "../../domain/kanji-list";
  import { listRounds } from "../../domain/questions";
  import { shuffle } from "../../domain/random";
  import { history } from "../../state/history.svelte";
  import { launcher } from "../../state/launcher.svelte";
  import { questions } from "../../state/questions.svelte";

  /**
   * 漢字一覧。問題データの漢字を回ごとに並べる。カードを押すと例文と意味が開く。
   * 「漢字を隠す」で、読みから漢字を思い出す確認にも使える（記録はしない）。
   */
  let filter = $state<KanjiListFilter>({ ...NO_LIST_FILTER });
  let hideKanji = $state(false);
  let showAll = $state(false);
  const opened = new SvelteSet<string>();

  const rounds = $derived(listRounds(questions.list));
  const shown = $derived(filterKanjiList(questions.list, filter));
  const groups = $derived(groupByRound(shown));
  const filtered = $derived(
    filter.round !== null || filter.query.trim() !== "",
  );

  function toggle(id: string) {
    if (opened.has(id)) opened.delete(id);
    else opened.add(id);
  }
  function toggleAll() {
    showAll = !showAll;
    opened.clear();
  }
  /** showAll のときは押したカードを閉じる、そうでなければ開く */
  const isOpen = (id: string) => showAll !== opened.has(id);

  async function startShown() {
    if (!shown.length) return;
    await launcher.launch(
      shuffle(
        shown.map((q) => q.id),
        Math.random,
      ),
      "normal",
    );
  }
</script>

<div class="mx-auto max-w-5xl pb-16">
  <div
    class="top-0 z-10 space-y-3 border-b border-stone-200 bg-stone-50/95 p-4 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur [@media(min-height:600px)]:sticky"
  >
    <header class="flex flex-wrap items-center gap-x-3 gap-y-2">
      <a href="#/" class="text-stone-500 underline">戻る</a>
      <h1 class="text-xl font-bold">漢字一覧</h1>
      <span class="text-sm text-stone-500" data-testid="list-count"
        >{filtered
          ? `${shown.length} / ${questions.list.length} 問`
          : `${questions.list.length} 問`}</span
      >
      <button
        class="{btn.small} ml-auto"
        disabled={!shown.length}
        onclick={startShown}>{shown.length} 問で出題する</button
      >
    </header>

    <div class="flex flex-wrap items-center gap-2 text-sm">
      <select
        class="min-h-11 rounded-lg border border-stone-300 bg-white px-2"
        bind:value={filter.round}
        aria-label="回で絞り込む"
      >
        <option value={null}>すべての回</option>
        {#each rounds as r (r)}<option value={r}>第{r}回</option>{/each}
      </select>
      <input
        type="search"
        class="min-h-11 min-w-0 flex-1 basis-48 rounded-lg border border-stone-300 bg-white px-3 sm:max-w-xs"
        placeholder="漢字・読みなどで探す"
        aria-label="漢字・読み・例文・意味で探す"
        bind:value={filter.query}
      />
      {#if filtered}
        <button
          class="min-h-11 px-1 underline"
          onclick={() => (filter = { ...NO_LIST_FILTER })}
          >絞り込みを外す</button
        >
      {/if}
      <button
        class={btn.small}
        aria-pressed={hideKanji}
        onclick={() => (hideKanji = !hideKanji)}
        >{hideKanji ? "漢字を見る" : "漢字を隠す"}</button
      >
      <button class={btn.small} aria-pressed={showAll} onclick={toggleAll}
        >{showAll ? "例文と意味を閉じる" : "例文と意味をすべて開く"}</button
      >
    </div>
  </div>

  <div class="space-y-8 p-4">
    {#each groups as g (g.round)}
      <section aria-labelledby="round-{g.round}">
        <h2
          id="round-{g.round}"
          class="mb-3 flex items-baseline gap-2 text-lg font-bold"
        >
          第{g.round}回
          <span class="text-sm font-normal text-stone-500"
            >{g.questions.length} 問</span
          >
        </h2>
        <ul
          class="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
        >
          {#each g.questions as q (q.id)}
            {@const open = isOpen(q.id)}
            {@const inReview = history.review.has(q.id)}
            <li
              class="{open
                ? 'col-span-full'
                : ''} rounded-2xl border bg-white {inReview
                ? 'border-amber-300'
                : 'border-stone-200'}"
              data-testid="kanji-card"
            >
              <button
                class="flex w-full items-start gap-3 p-3 text-left"
                aria-expanded={open}
                aria-controls="detail-{q.id}"
                onclick={() => toggle(q.id)}
              >
                <span class="flex min-w-0 flex-1 flex-col gap-1">
                  <span class="flex items-center gap-2 text-xs text-stone-500">
                    {q.id}
                    {#if inReview}<span
                        class="rounded bg-amber-100 px-1.5 py-0.5 text-amber-800"
                        >復習</span
                      >{/if}
                  </span>
                  {#if hideKanji && !open}
                    <span
                      class="font-serif text-3xl leading-tight font-bold text-stone-300"
                      data-testid="kanji-hidden"
                      aria-label="漢字（隠しています）">？</span
                    >
                  {:else}
                    <span
                      class="font-serif text-3xl leading-tight font-bold break-all"
                      data-testid="kanji">{q.kanji}</span
                    >
                  {/if}
                  <span class="text-sm text-stone-600">{q.yomi}</span>
                </span>
                <span class="text-stone-400" aria-hidden="true"
                  >{open ? "▲" : "▼"}</span
                >
              </button>
              {#if open}
                <div
                  id="detail-{q.id}"
                  class="space-y-2 border-t border-stone-100 px-3 pt-2 pb-3"
                  data-testid="kanji-detail"
                >
                  <div>
                    <p class="text-xs text-stone-500">例文</p>
                    <FuruText furu={q.furu} yomi={q.yomi} class="text-lg" />
                  </div>
                  <div>
                    <p class="text-xs text-stone-500">意味</p>
                    <p data-testid="imi">{q.imi}</p>
                  </div>
                </div>
              {/if}
            </li>
          {/each}
        </ul>
      </section>
    {:else}
      <p class="text-stone-500">
        {questions.list.length
          ? "条件に合う漢字がありません"
          : "問題データがありません"}
      </p>
    {/each}
  </div>
</div>
