# Extension Helper Startup Race Design

## Goal

Allow deployed Fantasy420 pages to contact the installed Fantasy420 extension when React starts before the extension content script has published its runtime ID.

## Cause

The content script writes its runtime ID to `document.documentElement.dataset.fantasy420ExtensionId`. The app-side `extensionHelper` currently reads that attribute once. On a fresh page load, React can call the helper before the content script writes the marker, producing `Fantasy420 extension unavailable` even though the extension attaches moments later.

## Design

Keep extension discovery centralized in `app/fantasy420/src/fantasy420/app/Draft/Extension.tsx`.

Before sending a message, the helper will:

1. Return an already-published extension ID immediately.
2. If the marker is absent, check for it every 50 milliseconds for up to three seconds.
3. Send the original message as soon as an ID appears.
4. Preserve the existing `Fantasy420 extension unavailable` rejection if the deadline expires.

The existing `no chrome runtime` error remains immediate because waiting for a DOM marker cannot create Chrome's external messaging API.

No extension files, message payloads, storage behavior, fetch behavior, or localhost behavior will change.

## Verification

- Preserve the existing immediate-discovery test.
- Add a test that starts a storage request before the marker exists, publishes the marker afterward, and verifies that the message reaches the discovered ID.
- Keep the missing-marker timeout test with fake timers so it remains fast.
- Run the full Vitest suite and production build.
- Commit and push to `main`, which triggers the existing Firebase deployment workflow.
