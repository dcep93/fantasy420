# Compact Mock Draft Config Design

## Goal

Keep the mock-draft configuration visually compact on wide desktop screens without hiding settings, stretching controls, or introducing horizontal scrolling.

## Layout

The setup card remains left-aligned, shrinks to its contents, and is capped at 900 pixels. Both settings groups use wrapping flex rows at desktop sizes:

- Each field is only as wide as its label and compact input require.
- The browser fits as many fields on each row as the available width allows.
- Primary and roster settings remain visually separated.

Numeric inputs use a compact three-rem width; the seed input uses six rem. Fields never grow to consume leftover row space. The title and start button remain together in the existing header.

## Responsive behavior

Fields wrap naturally as the viewport narrows. The setup card never exceeds the viewport width; there are no fixed column breakpoints or horizontal settings scrollers.

## Scope

This change affects only the mock-draft setup form. The active mock-draft panel, rankings workspace, values, validation, and draft behavior remain unchanged.

## Verification

Update the layout assertions to require shrink-to-content sizing, the 900-pixel cap, wrapping flex rows, non-growing fields, and compact inputs. Run the mock-draft component tests and production build, then measure field widths and settings per row at wide and narrow browser widths.
