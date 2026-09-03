# Bye Week Filter Highlight Design

## Goal

Make the active bye-week filter and its matching player rows immediately recognizable on the dark Draft page.

## Visual treatment

Use the existing `--night-focus` pink as the shared signal. The selected bye-week button receives a solid pink background and border with bold dark text. Each matching player's `index/posIndex/bye/byePick` cell receives the same pink background and bold dark text, keeping the emphasis attached to the cell that contains the bye-week value.

Nonmatching rows and position colors remain unchanged. The filter continues to toggle off when its selected week is clicked again.

## Semantics and verification

Give every bye-week option button semantics with `role="button"`, an identifying accessible label, and `aria-pressed`. Add integration assertions for the unselected state, selected button contrast, matching-cell contrast, nonmatching cells, and toggle-off behavior. Run the affected tests, full suite, and production build, then commit locally without pushing unless separately requested.
