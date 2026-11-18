/** 小さなハッシュルーター（設計計画書 2章）。#/setup などを画面の名前に対応させる */
export const ROUTES = [
  "home",
  "setup",
  "review",
  "practice",
  "answer",
  "grading",
  "result",
  "stats",
  "list",
  "settings",
  "trial",
] as const;
export type Route = (typeof ROUTES)[number];

function parse(hash: string): Route {
  const name = hash.replace(/^#\/?/, "").split(/[/?]/)[0] ?? "";
  return (ROUTES as readonly string[]).includes(name)
    ? (name as Route)
    : "home";
}

class Router {
  current = $state<Route>(
    parse(typeof location === "undefined" ? "" : location.hash),
  );

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener(
        "hashchange",
        () => (this.current = parse(location.hash)),
      );
    }
  }

  go(route: Route, replace = false) {
    const hash = route === "home" ? "#/" : `#/${route}`;
    if (replace) history.replaceState(null, "", hash);
    else location.hash = hash;
    this.current = route;
  }
}

export const router = new Router();
