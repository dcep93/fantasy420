# Compact Mock Draft Config Design

## Goal

Keep the mock-draft configuration visually compact on wide desktop screens without hiding settings, stretching controls, or introducing horizontal scrolling.

## Layout

The setup card remains left-aligned and shrinks to the width of its contents, subject to the viewport width. Both settings groups use a two-column intrinsic grid at desktop sizes:

- Primary settings flow into five complete rows of two controls.
- Roster settings flow into four complete rows of two controls.

Inputs return to compact fixed widths; the seed input remains slightly longer. Grid tracks size to their contents rather than expanding to fill a large arbitrary card width. The title and start button remain together in the existing header.

## Responsive behavior

Below 500 pixels, each settings group uses one column. The setup card never exceeds the viewport width.

## Scope

This change affects only the mock-draft setup form. The active mock-draft panel, rankings workspace, values, validation, and draft behavior remain unchanged.

## Verification

Update the layout assertions to require shrink-to-content sizing, two intrinsic desktop columns, compact inputs, wrapping roster controls, and the one-column phone breakpoint. Run the mock-draft component tests and production build, then inspect the form at wide and narrow browser widths.
