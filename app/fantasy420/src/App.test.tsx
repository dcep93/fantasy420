import { render } from "@testing-library/react";

import App from "./App";

test("renders the public application shell without prompting", () => {
  window.history.pushState({}, "", "/");
  window.localStorage.clear();
  const prompt = vi.spyOn(window, "prompt");

  const { container } = render(<App />);

  expect(container.firstChild).toBeTruthy();
  expect(prompt).not.toHaveBeenCalled();

  prompt.mockRestore();
});
