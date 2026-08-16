# 2026 Draft Data Design

## Goal

Initialize the application for the 2026 fantasy football season while preserving the existing rankings JSON format.

## Data files

- Add `Draft/2026.json` using the existing `{ source: { playerName: numericValue } }` schema. Initialize it with empty ESPN ranking sources so additional one-QB or superflex sources can be added later without a schema migration.
- Generate `Wrapped/dataJson/2026.json` through the existing `FetchWrapped` pipeline so it contains current ESPN player IDs and the other fields required by `WrappedType`.

## Registration

- Import and register the new rankings file in `Draft/index.tsx`.
- Import and register the new wrapped file in `Wrapped/allWrapped.tsx`.
- Change `currentYear` to `"2026"`.

## Draft ranking updates

Replace the local `2025` constant in `updateDraftRanking` with `selectedYear`. Both ESPN read and write URLs and the fantasy filter will therefore use the selected season.

## Validation

- Confirm both JSON files parse.
- Confirm the wrapped file reports season 2026 and includes a non-empty NFL player map.
- Run the TypeScript/Vite build and the existing test suite.

## Scope

This change deliberately retains the legacy rankings schema and converter behavior. Source metadata, superflex filtering, unmatched-name reporting, and composite changes are outside this task.
