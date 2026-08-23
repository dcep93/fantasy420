# Mock Draft Default Without DST

## Goal

Make the default mock-draft roster match last year's shape except for removing the required DST and K slots.

## Default Roster

The default roster will use `DST: 0`, `K: 0`, and `BENCH: 5`. All other position and flex counts remain unchanged. The total stays at fourteen rounds: the two removed specialist slots are the only differences from last year's sixteen-round shape.

DST remains an editable roster setting and a draft-eligible position. A user can opt back into a required DST slot or manually select a DST as a bench choice. K remains hidden and ineligible under the existing no-kicker rule.

## Historical Calibration

The 2024–2025 calibration will use an explicit historical roster shape with `DST: 1`, reflecting the rules under which those drafts occurred. It will no longer derive position capacities from the current default roster. This keeps the checked-in coefficients reproducible when present-day defaults change and avoids incorrectly treating historical DST selections as picks at a position with no historical slot.

## Testing

Automated checks will verify:

- the default has `DST: 0`, `K: 0`, and `BENCH: 5`;
- the default remains fourteen rounds;
- the setup form displays an editable DST value of zero and no K input;
- DST remains draft-eligible; and
- the historical calibration still reproduces its existing observation counts and fitted coefficients.

The focused mock-draft and calibration suites, full frontend suite, calibration command, and production build will run after implementation.
