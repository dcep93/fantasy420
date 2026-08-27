# Mock Draft Settings Storage Design

## Goal

Keep a user's mock-draft setup preferences across reloads while ensuring every fresh draft still receives a fresh or explicitly entered seed.

## Stored state

Store a versioned snapshot of the live setup form in browser local storage after every non-seed edit. The snapshot contains draft position, team count, the three risk inputs, all four position appetites, and every roster slot. Risk and appetite values remain strings in the snapshot so an in-progress blank field restores exactly as entered.

The seed is absent from the storage schema. Editing it changes only the current component state, and a fresh setup always starts with a blank seed and the existing `random` placeholder.

## Precedence

When there is no active mock draft, initialize the form from the saved snapshot, falling back field by field to the existing defaults. When an active draft is loaded from the URL or history, its settings remain authoritative, including its seed. Merely opening an active draft does not replace the saved preferences; a subsequent manual non-seed edit saves the displayed form as the new preference snapshot.

## Failure handling

Storage parsing and writing are isolated in a small pure module. Malformed JSON, unavailable storage, unsupported versions, invalid field types, and incomplete older snapshots fall back safely to defaults without breaking the form. Numeric setup and roster values accept only finite numbers during restoration; risk and appetite form values accept strings or finite numbers and are restored as strings.

## Verification

Unit tests cover a full round trip, field-by-field fallback, malformed storage, and structural seed exclusion. Component tests cover immediate persistence for each settings group, exact restoration of blank factor input, seed non-persistence, active-draft precedence, and saving after a manual edit to active settings. Existing submission normalization and validation tests remain unchanged.
