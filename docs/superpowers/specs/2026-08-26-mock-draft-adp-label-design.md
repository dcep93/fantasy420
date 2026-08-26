# Mock Draft ADP Label Design

## Goal

Make the raw ranking beneath each mock-draft pick read naturally as ADP.

## Display

Change the text from `composite #N` to `N ADP`. Keep the same raw composite rank value, placement beneath the round/overall pick, styling, and exclusion of My score. No draft-selection, hash, history, or ranking behavior changes.

## Verification

Update component and exact-seed integration assertions to parse and expect the new wording. Run the affected tests and production build before publishing.
