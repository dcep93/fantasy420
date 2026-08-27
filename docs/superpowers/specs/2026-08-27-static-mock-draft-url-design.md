# Static Mock Draft URL Design

## Goal

Keep the mock-draft URL short and static while retaining an in-progress draft across reloads on the same browser.

## State location

Move the active mock-draft settings and ordered picks from the `#draft=...` URL payload to a separate versioned local-storage record. Starting, advancing, nudging, rewinding, or restarting a mock draft replaces that record immediately. Reloading `/draft` restores and validates the record before continuing the draft.

This active-draft record is separate from the mock-draft setup preferences. The active record includes the resolved seed because deterministic continuation requires it; the setup-preferences record continues to exclude seed.

## URL behavior

The Draft page never writes draft state into the URL. It removes an existing hash from the current Draft URL on mount and whenever the hash changes, without loading the hash payload. Path and query string remain intact. Consequently, copied URLs contain no draft state and cannot transfer a mock draft to another browser.

## Draft behavior

The existing in-memory React state remains the immediate source of truth. Local storage provides only persistence across reloads. Rechoose and nudge operations continue to derive the next complete state using the existing pure draft functions, then save that state locally. Live-draft behavior remains active only when there is no locally restored mock draft.

## Failure handling

Malformed JSON, unsupported storage versions, unavailable storage, invalid settings, invalid pick types, or duplicate picks restore as no active mock draft. Player eligibility and player-id validation remain in the Draft page; a locally restored draft that fails those checks is removed from local storage so it cannot fail on every reload.

## Verification

Replace hash codec tests with local-storage round-trip, malformed-data, validation, clearing, and storage-failure tests. Update integration coverage to seed and inspect local state while asserting that the URL remains `/draft` through start, player picks, nudge, rechoose, and restart. Verify reload restoration, legacy hash removal without import, all existing draft behavior, the full test suite, and the production build.
