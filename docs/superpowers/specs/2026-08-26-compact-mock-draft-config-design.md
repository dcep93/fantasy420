# Compact Mock Draft Config Design

## Goal

Keep the mock-draft configuration visually compact on wide desktop screens without hiding settings, stretching controls, or introducing horizontal scrolling.

## Layout

The setup card uses the full available width. Both settings groups use wrapping flex rows at desktop sizes:

- Each field is only as wide as its label and compact input require.
- The browser fits as many fields on each row as the available width allows.
- Primary and roster settings remain visually separated.

Numeric inputs use a compact two-rem width; the seed input uses five rem. Field padding and inter-field gaps are reduced, and fields never grow to consume leftover row space. At a 1470-pixel CSS viewport, all ten primary settings fit on one row and all eight roster settings fit on one row. The title and start button remain together in the existing header.

## Responsive behavior

Fields wrap naturally as the viewport narrows. There are no fixed column breakpoints or horizontal settings scrollers.

## Scope

This change affects only the mock-draft setup form. The active mock-draft panel, rankings workspace, values, validation, and draft behavior remain unchanged.

## Verification

Update the layout assertions to require the full-width setup card, wrapping flex rows, non-growing fields, reduced spacing, and compact inputs. Run the mock-draft component tests and production build, then confirm ten primary and eight roster controls per row at a 1470-pixel viewport plus natural wrapping at narrower widths.
