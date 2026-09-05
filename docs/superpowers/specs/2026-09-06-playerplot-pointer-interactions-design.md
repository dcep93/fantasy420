# PlayerPlot Pointer Interactions Design

## Goal

Keep the PlayerPlot reticule aligned with the dot targeted by a mouse while preserving a practical tap target and persistent tooltip activation on mobile devices.

## Cause

Every four-pixel scatter marker currently contains a transparent hit circle with a 22-pixel radius. PlayerPlot can render more than one thousand points, so these circles overlap extensively. A pointer placed directly over one visible dot can therefore hit a later overlapping circle belonging to another dot, causing Recharts to draw its reticule several pixels away.

## Design

PlayerPlot will select its interaction behavior from pointer capabilities rather than viewport width:

- Fine pointers with hover support will disable the expanded transparent circle. The visible marker will remain interactive, so desktop hover resolves to the dot actually under the pointer.
- Coarse pointers or devices without hover will retain the 44-pixel transparent target and configure Recharts for click activation. A tap will open and retain the tooltip without requiring emulated hover.
- Pointer-capability changes will be observed so convertible and hybrid devices can update without a reload.

The shared chart-point component will expose whether its expanded target is interactive, but its visible marker and geometry will not change. PlayerStats and other existing consumers will keep the current default expanded target unless they explicitly opt out.

## Alternatives Considered

Shrinking every hit target would improve desktop accuracy but make touch interaction unreliable. Replacing Recharts interaction with a custom nearest-point engine would provide stronger control in dense plots, but it would duplicate chart coordinate and tooltip state for a narrowly scoped bug.

## Verification

- Unit-test the pointer-capability listener and its legacy browser fallback.
- Assert that PlayerPlot uses hover activation with a disabled expanded target on fine pointers.
- Assert that PlayerPlot uses click activation with the expanded target on coarse pointers.
- Preserve the shared target's current default behavior in its component tests.
- Run the full configured test suite and production build.
- Verify desktop hover and mobile-sized tap behavior in the local application.
