import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchExtensionStorage } from "./Extension";

describe("Fantasy420 extension discovery", () => {
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    delete document.documentElement.dataset.fantasy420ExtensionId;
    window.chrome = undefined;
  });

  it("sends through the discovered extension ID", async () => {
    document.documentElement.dataset.fantasy420ExtensionId = "generated-id";
    const sendMessage = vi.fn(
      (
        _id: string,
        _payload: unknown,
        callback: (response: unknown) => void
      ) => callback({ draft: ["Josh Allen"] })
    );
    window.chrome = { runtime: { sendMessage, lastError: null } };

    await expect(fetchExtensionStorage("draft")).resolves.toEqual([
      "Josh Allen",
    ]);
    expect(sendMessage).toHaveBeenCalledWith(
      "generated-id",
      { storage: { action: "get", keys: ["draft"] } },
      expect.any(Function)
    );
  });

  it("waits for the extension marker during content-script startup", async () => {
    vi.useFakeTimers();
    const sendMessage = vi.fn(
      (
        _id: string,
        _payload: unknown,
        callback: (response: unknown) => void
      ) => callback({ draft: ["Josh Allen"] })
    );
    window.chrome = { runtime: { sendMessage, lastError: null } };

    const request = fetchExtensionStorage("draft");
    const expectation = expect(request).resolves.toEqual(["Josh Allen"]);
    window.setTimeout(() => {
      document.documentElement.dataset.fantasy420ExtensionId = "late-id";
    }, 25);
    await vi.advanceTimersByTimeAsync(50);

    await expectation;
    expect(sendMessage).toHaveBeenCalledWith(
      "late-id",
      { storage: { action: "get", keys: ["draft"] } },
      expect.any(Function)
    );
  });

  it("rejects clearly when the extension marker is missing", async () => {
    vi.useFakeTimers();
    window.chrome = { runtime: { sendMessage: vi.fn() } };
    const request = fetchExtensionStorage("draft");
    const expectation = expect(request).rejects.toBe(
      "Fantasy420 extension unavailable"
    );
    await vi.advanceTimersByTimeAsync(3000);
    await expectation;
  });
});
