import { useSyncExternalStore } from "react";

function subscribe(listener: () => void) {
  window.addEventListener("hashchange", listener);
  return () => window.removeEventListener("hashchange", listener);
}

export function useWrappedHash() {
  return useSyncExternalStore(subscribe, () => window.location.hash, () => "");
}

export function parseWrappedHash(hash: string) {
  const [tab, ...query] = hash.replace(/^#/, "").split("?");
  return { tab, params: new URLSearchParams(query.join("?")) };
}
