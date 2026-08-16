import { render, screen } from "@testing-library/react";
import { StrictMode } from "react";

import DraftAccessGate, {
  DRAFT_PASSWORD,
  DRAFT_PASSWORD_STORAGE_KEY,
} from "./DraftAccessGate";

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

test("uses a valid cached password without prompting", () => {
  window.localStorage.setItem(DRAFT_PASSWORD_STORAGE_KEY, DRAFT_PASSWORD);
  const prompt = vi.spyOn(window, "prompt");

  render(
    <DraftAccessGate>
      <div>Draft rankings</div>
    </DraftAccessGate>
  );

  expect(screen.getByText("Draft rankings")).toBeInTheDocument();
  expect(prompt).not.toHaveBeenCalled();
});

test("stores a correct prompted password and grants access once in Strict Mode", async () => {
  const prompt = vi.spyOn(window, "prompt").mockReturnValue(DRAFT_PASSWORD);

  render(
    <StrictMode>
      <DraftAccessGate>
        <div>Draft rankings</div>
      </DraftAccessGate>
    </StrictMode>
  );

  expect(await screen.findByText("Draft rankings")).toBeInTheDocument();
  expect(prompt).toHaveBeenCalledTimes(1);
  expect(window.localStorage.getItem(DRAFT_PASSWORD_STORAGE_KEY)).toBe(
    DRAFT_PASSWORD
  );
});

test("denies access after an incorrect password", async () => {
  vi.spyOn(window, "prompt").mockReturnValue("nope");

  render(
    <DraftAccessGate>
      <div>Draft rankings</div>
    </DraftAccessGate>
  );

  expect(
    await screen.findByText("Draft access denied. Reload the page to try again.")
  ).toBeInTheDocument();
  expect(screen.queryByText("Draft rankings")).not.toBeInTheDocument();
  expect(window.localStorage.getItem(DRAFT_PASSWORD_STORAGE_KEY)).toBeNull();
});
