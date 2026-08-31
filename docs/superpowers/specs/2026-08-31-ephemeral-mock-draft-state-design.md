# Ephemeral Mock Draft State Design

## Goal

Keep an active mock draft only for the lifetime of the mounted Draft page. Reloading or reopening `/draft` always starts without picks or an active mock draft.

## State boundaries

Active draft settings, the resolved seed, ordered picks, nudges, and rechoose state remain only in the Draft component's React state. Starting or changing a draft updates that state and never writes it to local storage, session storage, browser history state, or the URL.

The separate mock-draft setup preferences remain in local storage as previously requested. They include draft position, team count, risk factors, position appetites, and roster counts, but exclude seed. Therefore a reload restores the setup form preferences while discarding the active draft and its seed and picks.

## URL and legacy cleanup

The URL remains static. Draft removes URL hashes without loading them. On mount it also removes the obsolete `fantasy420:draft:active-mock-draft` local-storage record created by the previous implementation, ensuring an older saved draft cannot return and leaving no active-draft durability behind.

## Verification

Remove the active-draft storage adapter and its unit tests. Update integration tests to exercise start, picks, nudge, rechoose, and restart through rendered state, assert that no active-draft storage record is created, and verify that unmounting and remounting resets the draft while setup preferences remain. Run the full test suite and production build, then commit locally without pushing.
