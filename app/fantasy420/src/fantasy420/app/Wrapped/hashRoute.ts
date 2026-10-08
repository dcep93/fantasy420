import { useSyncExternalStore } from "react";

function subscribe(listener: () => void) {
  window.addEventListener("hashchange", listener);
  return () => window.removeEventListener("hashchange", listener);
}

export function useWrappedHash() {
  return useSyncExternalStore(subscribe, () => window.location.hash, () => "");
}

// Query-only changes must not remount the active tab and discard its local state.
export function useWrappedTab() {
  return useSyncExternalStore(subscribe, () => parseWrappedHash(window.location.hash).tab, () => "");
}

export function parseWrappedHash(hash: string) {
  const [tab, ...query] = hash.replace(/^#/, "").split("?");
  return { tab, params: new URLSearchParams(query.join("?")) };
}
