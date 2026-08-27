# Compact Mock Draft Config Design

## Goal

Keep the mock-draft configuration visually compact on wide desktop screens without hiding settings or introducing horizontal scrolling.

## Layout

The setup card remains left-aligned and uses a maximum width of 1000 pixels. Both settings groups use a four-column grid at desktop sizes:

- Primary settings flow into rows of four controls, producing a 4/4/2 layout.
- Roster settings flow into two rows of four controls.

Every field fills its grid cell, and its input uses the remaining width after the label. The title and start button remain together in the existing header.

## Responsive behavior

Below 800 pixels, each settings group uses two columns. Below 500 pixels, it uses one column. The setup card never exceeds the viewport width.

## Scope

This change affects only the mock-draft setup form. The active mock-draft panel, rankings workspace, values, validation, and draft behavior remain unchanged.

## Verification

Update the layout assertions to require the capped setup width, four-column desktop grid, wrapping roster controls, and responsive two- and one-column breakpoints. Run the mock-draft component tests and production build, then inspect the form at wide and narrow browser widths.
