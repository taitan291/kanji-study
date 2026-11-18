<script lang="ts">
  import FuruText from "../../components/FuruText.svelte";
  import { btn } from "../../components/buttons";
  import { wrongQuestionIds } from "../../domain/quiz-session";
  import { shuffle } from "../../domain/random";
  import { activeQuiz } from "../../state/active-quiz.svelte";
  import { launcher } from "../../state/launcher.svelte";
  import { practicePlan } from "../../state/practice-plan.svelte";
  import { questions } from "../../state/questions.svelte";
  import { router } from "../../state/router.svelte";

  const quiz = $derived(
    activeQuiz.quiz?.phase === "confirmed" ? activeQuiz.quiz : null,
  );
  const wrong = $derived(quiz ? wrongQuestionIds(quiz) : []);
  const total = $derived(quiz?.questionIds.length ?? 0);

  $effect(() => {
    if (activeQuiz.route !== "result") router.go(activeQuiz.route, true);
  });

  /** 間違えた問題だけで、すぐに次の回を始める（仕様書 6.2） */
  async function retryWrong() {
    if (!quiz || wrong.length === 0) return;
    const ids = shuffle(wrong, Math.random);
    await launcher.launch(ids, quiz.mode, quiz.range);
  }

  /** 間違えた問題を、見ながら書いて練習してから解き直す */
  function practiceThenRetry() {
    if (!quiz || wrong.length === 0) return;
    practicePlan.set({
      kind: "retry",
      questionIds: [...wrong],
      retry: {
        questionIds: shuffle(wrong, Math.random),
        mode: quiz.mode,
        ...(quiz.range ? { range: quiz.range } : {}),
      },
    });
    activeQuiz.close();
    router.go("practice");
  }

  function home() {
    activeQuiz.close();
    router.go("home");
  }
</script>

{#if quiz}
  <div class="mx-auto max-w-3xl space-y-6 p-4 pb-16">
    <h1 class="text-xl font-bold">結果</h1>
    <p class="text-4xl font-bold" data-testid="score">
      {total - wrong.length}
      <span class="text-xl text-stone-500">/ {total} 問 正解</span>
    </p>

    {#if wrong.length}
      <section>
        <h2 class="mb-2 text-lg font-bold">間違えた問題</h2>
        <ul
          class="divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white"
        >
          {#each wrong as id (id)}
            {@const q = questions.get(id)}
            {#if q}
              <li class="flex items-center gap-4 p-3">
                <span class="min-w-20 font-serif text-2xl font-bold"
                  >{q.kanji}</span
                >
                <FuruText furu={q.furu} yomi={q.yomi} class="text-base" />
              </li>
            {/if}
          {/each}
        </ul>
      </section>
    {:else}
      <p class="text-lg text-emerald-700">全問正解です！</p>
    {/if}

    <div class="flex flex-wrap justify-end gap-3">
      <button class={btn.secondary} onclick={home}>ホームへ</button>
      {#if wrong.length}
        <button class={btn.secondary} onclick={retryWrong}
          >練習せずにもう一度</button
        >
        <button class={btn.primary} onclick={practiceThenRetry}
          >間違えた問題を練習してからもう一度</button
        >
      {/if}
    </div>
  </div>
{/if}
