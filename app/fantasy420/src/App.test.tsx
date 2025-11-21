import { render } from "@testing-library/react";

import App from "./App";

test("renders application shell", () => {
  const { container } = render(<App />);
  expect(container.firstChild).toBeTruthy();
});
