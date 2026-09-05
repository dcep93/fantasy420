import { useEffect, useState } from "react";

export const COARSE_POINTER_QUERY = "(hover: none), (pointer: coarse)";

function matchesCoarsePointer() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia(COARSE_POINTER_QUERY).matches
  );
}

export function useCoarsePointer() {
  const [isCoarsePointer, setIsCoarsePointer] = useState(
    matchesCoarsePointer
  );

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;

    const mediaQuery = window.matchMedia(COARSE_POINTER_QUERY);
    const update = (event?: MediaQueryListEvent) =>
      setIsCoarsePointer(event?.matches ?? mediaQuery.matches);

    update();
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", update);
      return () => mediaQuery.removeEventListener("change", update);
    }

    mediaQuery.addListener(update);
    return () => mediaQuery.removeListener(update);
  }, []);

  return isCoarsePointer;
}
