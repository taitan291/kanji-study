<script lang="ts">
  import { onMount } from "svelte";
  import Dialog from "./components/Dialog.svelte";
  import { btn } from "./components/buttons";
  import AnswerScreen from "./screens/answer/AnswerScreen.svelte";
  import GradingScreen from "./screens/grading/GradingScreen.svelte";
  import HomeScreen from "./screens/home/HomeScreen.svelte";
  import KanjiListScreen from "./screens/list/KanjiListScreen.svelte";
  import ResultScreen from "./screens/result/ResultScreen.svelte";
  import PracticeScreen from "./screens/practice/PracticeScreen.svelte";
  import ReviewScreen from "./screens/review/ReviewScreen.svelte";
  import StatsScreen from "./screens/stats/StatsScreen.svelte";
  import SettingsScreen from "./screens/settings/SettingsScreen.svelte";
  import SetupScreen from "./screens/setup/SetupScreen.svelte";
  import TrialScreen from "./screens/trial/TrialScreen.svelte";
  import { activeQuiz } from "./state/active-quiz.svelte";
  import { history } from "./state/history.svelte";
  import { launcher } from "./state/launcher.svelte";
  import { questions } from "./state/questions.svelte";
  import { router } from "./state/router.svelte";
  import { requestPersist } from "./storage/persist";

  let startupError = $state("");

  onMount(async () => {
    try {
      await Promise.all([
        questions.load(),
        history.load(),
        activeQuiz.checkPending(),
      ]);
      // 未完了の回があれば、ホームで「再開 / 破棄」を聞く（仕様書 4.4）
      if (activeQuiz.pending) router.go("home", true);
      void requestPersist();
    } catch (e) {
      startupError = e instanceof Error ? e.message : String(e);
    }
  });

  const ready = $derived(questions.status === "ready" && history.loaded);
</script>

{#if startupError || questions.status === "error"}
  <main class="p-6">
    <p class="text-red-700" role="alert">
      読み込みに失敗しました: {startupError || questions.errorMessage}
    </p>
    <button class="{btn.secondary} mt-4" onclick={() => location.reload()}
      >再読み込み</button
    >
  </main>
{:else if !ready}
  <main class="flex min-h-full items-center justify-center p-6 text-stone-500">
    読み込み中…
  </main>
{:else if router.current === "setup"}
  <SetupScreen />
{:else if router.current === "review"}
  <ReviewScreen />
{:else if router.current === "practice"}
  <PracticeScreen />
{:else if router.current === "stats"}
  <StatsScreen />
{:else if router.current === "list"}
  <KanjiListScreen />
{:else if router.current === "answer"}
  <AnswerScreen />
{:else if router.current === "grading"}
  <GradingScreen />
{:else if router.current === "result"}
  <ResultScreen />
{:else if router.current === "settings"}
  <SettingsScreen />
{:else if router.current === "trial"}
  <TrialScreen />
{:else}
  <HomeScreen />
{/if}

<Dialog open={launcher.waiting !== null} title="途中の回があります">
  採点が終わっていない回があります。破棄して新しく始めますか？（破棄した回は統計に記録されません）
  {#snippet actions()}
    <button class={btn.secondary} onclick={() => launcher.cancel()}
      >やめる</button
    >
    <button class={btn.danger} onclick={() => launcher.confirm()}
      >破棄して始める</button
    >
  {/snippet}
</Dialog>
