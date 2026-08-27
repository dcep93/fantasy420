# Reddit Player Fetch Design

## Problem

The Fantasy420 Reddit integration loads ESPN's player bank with a direct
cross-origin `fetch()` from code executing in the Reddit page. That request is
subject to the page's network policy and currently surfaces `Failed to fetch`.
The same code also hardcodes the 2025 ESPN season.

## Design

Keep Reddit DOM processing in `extensions/reddit/scrape.js`, but move the ESPN
network request across the extension's existing external-message boundary. The
page script will call `do_send_message()` with a fixed ESPN URL, JSON response
mode, request headers, and the existing six-hour cache duration. The extension
service worker will perform the request from the extension origin.

Add only `https://lm-api-reads.fantasy.espn.com/*` to `host_permissions`. This
grants the service worker access to the required API without broadening access
to unrelated hosts.

The ESPN season in the URL will be `new Date().getFullYear()`. Fantasy420 uses
the upcoming/current calendar-year fantasy season, and this removes the annual
manual source edit.

## Response and Error Handling

The service worker will preserve its existing response shape on success. On a
network error it will send a serializable `{ error: <message> }` response so the
message channel always resolves. The Reddit integration will reject that error
before attempting to transform the response. Its existing top-level handler
will continue to surface the failure to the user.

Non-2xx ESPN responses will also become errors. This prevents an HTML or error
payload from being treated as the expected player array.

## Testing

Extend the background service-worker tests to cover:

- a successful JSON fetch and response;
- forwarding the ESPN request headers;
- keeping the asynchronous message channel open;
- a network failure returning a serializable error; and
- an HTTP failure returning an error rather than attempting player processing.

Add focused Reddit-script coverage for current-year URL construction and
conversion of the service-worker response into the existing player-bank shape.
The full extension Node test suite must pass.

## Scope

No Reddit UI, stored Reddit data shape, ESPN draft integration, or application
code will change. Existing unrelated worktree changes remain untouched.
