# Draft Password Gate Design

## Goal

Add a lightweight client-side hurdle in front of the draft tool without affecting the public wrapped page.

## Behavior

- `/draft` is wrapped in a dedicated access-gate component.
- `/` and the other application routes keep their existing behavior.
- The gate checks `localStorage` for the literal password `jon sucks`.
- If the cached value is absent or incorrect, the gate asks for the password with `window.prompt`.
- A correct response is stored in `localStorage` and the draft UI renders.
- A cancelled or incorrect response renders a short access-denied message. Navigating away and back, or reloading, permits another attempt.

## Implementation

The router will declare the draft route separately instead of including it in the generic page map. A small `DraftAccessGate` component will own the plaintext password, storage key, prompt, and access state. The prompt runs from a guarded effect so React Strict Mode cannot display it twice for one mount.

This is intentionally not security: anyone can read the password from the client bundle or modify browser storage. It is only the extra hurdle requested for casual access.

## Verification

Focused tests will cover a valid cached password, a correct prompt response and cache write, an incorrect response, and the fact that `/` never prompts. The production build and browser smoke tests will verify that `/` renders publicly and `/draft` prompts once, renders after the correct password, and remains available from the cache.
