# Dynamic Fantasy420 Extension ID Design

## Goal

Allow the deployed Fantasy420 draft page and injected draft-source adapters to communicate with whichever unpacked Fantasy420 extension instance is actually installed in Chrome. The integration must not depend on the historical hardcoded extension ID `dikaanhdjgmmeajanfokkalonmnpfidm`.

## Architecture

The existing external-message storage contract remains unchanged. The extension content script will publish its own `chrome.runtime.id` on the page's root element under a Fantasy420-specific data attribute. DOM attributes cross Chrome's isolated-world boundary, so both the deployed React application and the page-context draft adapters can discover the active extension without a new message-relay protocol.

The content script continues to run on the manifest's existing URL set. It will publish the ID before routing and injecting any page-specific adapter scripts. Fantasy420's polling loop already retries failed requests, so a page that begins rendering before the content script publishes the ID will recover automatically.

## Components and Data Flow

`extension/content_script.js` will set `data-fantasy420-extension-id` on `document.documentElement` from `chrome.runtime.id`.

`app/fantasy420/src/fantasy420/app/Draft/Extension.tsx` will resolve the current extension ID from that attribute immediately before each request. If no ID is available, it will reject with a clear `Fantasy420 extension unavailable` error; the existing polling loop will retry after 500 milliseconds.

`extension/extensions/shared.js` will resolve the same attribute before storage requests from FantasyPros, Sleeper, and ESPN adapters. Missing IDs will reject rather than targeting a stale extension. The FantasyPros adapter's existing one-second loop will retry after the marker appears.

The legacy hardcoded ID will be removed from these live-draft paths. Unrelated legacy references in `vegas.js` are outside this repair because they serve a separate workflow and changing them is not necessary to restore draft synchronization.

## Error Handling

- A missing or disabled extension produces a clear local error and does not terminate either polling loop.
- An extension reload changes the marker to the currently active runtime ID when the page reloads.
- External messaging remains restricted by `externally_connectable.matches`; publishing the non-secret extension ID does not broaden access.
- Invalid or empty marker values are treated as unavailable.

## Verification

Automated tests will cover extension-ID discovery, missing-marker rejection, and request routing to the discovered ID. Existing extension tests, all Fantasy420 Vitest tests, and the production build must pass.

After deployment, live verification will reload DraftWizard and Fantasy420, confirm that the active extension marker is present on both pages, and confirm that every completed DraftWizard selection reaches Fantasy420 in chronological order.
