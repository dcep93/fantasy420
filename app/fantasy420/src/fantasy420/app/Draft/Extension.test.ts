import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchExtensionStorage } from "./Extension";

describe("Fantasy420 extension discovery", () => {
  afterEach(() => {
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

  it("rejects clearly when the extension marker is missing", async () => {
    window.chrome = { runtime: { sendMessage: vi.fn() } };
    await expect(fetchExtensionStorage("draft")).rejects.toBe(
      "Fantasy420 extension unavailable"
    );
  });
});
