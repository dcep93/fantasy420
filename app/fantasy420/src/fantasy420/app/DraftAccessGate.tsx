import { PropsWithChildren, useEffect, useRef, useState } from "react";

export const DRAFT_PASSWORD = "jon sucks";
export const DRAFT_PASSWORD_STORAGE_KEY = "fantasy420:draft-password";

type AccessState = "checking" | "granted" | "denied";

export default function DraftAccessGate({ children }: PropsWithChildren) {
  const [access, setAccess] = useState<AccessState>(() =>
    window.localStorage.getItem(DRAFT_PASSWORD_STORAGE_KEY) === DRAFT_PASSWORD
      ? "granted"
      : "checking"
  );
  const hasPrompted = useRef(false);

  useEffect(() => {
    if (access !== "checking" || hasPrompted.current) return;

    hasPrompted.current = true;
    const enteredPassword = window.prompt("Enter the draft password");

    if (enteredPassword === DRAFT_PASSWORD) {
      window.localStorage.setItem(
        DRAFT_PASSWORD_STORAGE_KEY,
        enteredPassword
      );
      setAccess("granted");
      return;
    }

    setAccess("denied");
  }, [access]);

  if (access === "checking") return null;

  if (access === "denied") {
    return <main>Draft access denied. Reload the page to try again.</main>;
  }

  return <>{children}</>;
}
