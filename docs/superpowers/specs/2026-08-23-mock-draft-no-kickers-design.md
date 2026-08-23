# Fourteen-Round Mock Draft Without Kickers

## Goal

Change the default mock draft from sixteen rounds to fourteen rounds and prevent kickers from being selected anywhere in mock-draft mode.

## Default Roster

The default roster will change from one kicker and five bench slots to zero kickers and four bench slots. All other slot counts remain unchanged, producing fourteen total rounds.

The `K` field will remain in the serialized roster shape with a required value of zero so settings and hash payloads retain a stable schema. The setup form will no longer expose an editable K-slot input. Validation will reject nonzero K-slot counts, including incompatible restored hashes.

## Eligibility

One shared eligibility function will identify mock-draft players. Kickers are ineligible; all existing non-kicker positions remain eligible. The rule will be applied to:

- simulated opponent choices;
- direct user picks;
- historical-pick availability and nudging;
- draft-board ranking calculations;
- restored mock-draft picks; and
- the rankings table while mock-draft mode is active.

Outside mock-draft mode, the normal rankings table may continue to display kickers. The K position-filter control will be omitted while a mock draft is active so the interface does not offer an empty or unusable filter.

## Restored State

A restored mock-draft hash is invalid when its settings request one or more K slots or its saved picks contain a kicker. The existing mock-draft load error surface will explain that a kicker is not eligible rather than silently rewriting historical state.

## Testing

Automated coverage will verify:

- the default roster has `K: 0`, `BENCH: 4`, and fourteen rounds;
- the setup form omits an editable K-slot field;
- settings validation rejects nonzero K slots;
- user and simulated picks cannot select kickers;
- historical availability excludes kickers;
- mock-draft rankings hide kicker rows and the K filter;
- normal non-mock rankings retain kicker visibility; and
- restored hashes containing kicker picks show a load error.

The focused mock-draft suites, full frontend test suite, and production build will run after implementation.
