# Drafted Table Treatment and Mock Roster Column

## Goal

Make drafted players visibly unavailable in the rankings table without losing the first column's dark visual anchor, and show the user's mock-drafted players in a full-card roster column beside the rankings table.

## Layout

The existing source, filter, and draft utility pane will move above the rankings area. During an active mock draft, the area below it will contain two side-by-side children:

1. a left roster column containing only the user's drafted players; and
2. the existing `mock-draft-player-scroller` containing filters and the rankings table.

The roster remains a vertical column at narrow widths. The rankings area keeps its own scrolling behavior so the roster does not displace or stack above it. Outside mock-draft mode, the roster column is absent and the rankings scroller uses the available width.

## User Roster

The roster will reuse the existing full mock-draft pick bubble rather than duplicate its player presentation. Each item therefore retains the same headshot or fallback, position color, pick metadata, ranking controls, and user-pick border as its board counterpart.

Only picks owned by the configured user draft position appear. They are sorted by normalized football position in this order:

1. QB
2. RB
3. WR
4. TE
5. DST
6. K

Players at the same position are sorted by ascending overall pick index. The order does not depend on the board's round/position display toggle.

## Drafted Rankings Rows

Drafted status will no longer rely on a row background that is hidden by position-colored cells. Every drafted row cell except the first will render at `opacity: 0.8`. The first metadata cell will stay fully opaque with a dark background and light text. Applying opacity at the cell level is required because CSS opacity on the row would also fade the first cell and cannot be undone by a descendant.

Undrafted rows keep their current position colors and first-column treatment. Drafted state continues to come from live draft data, mock-draft history, or the existing local toggle.

## Components

- `MockDraftView.tsx` will expose a roster-column view and reuse the shared pick-bubble renderer.
- `MockDraftView.css` will define the compact fixed-width vertical roster layout and the side-by-side rankings layout.
- `Draft/index.tsx` will arrange controls above the rankings area, render the roster only in mock mode, and attach drafted-state classes to table rows/cells.

## Testing

Focused component and integration tests will verify:

- only user-owned mock picks appear in the roster;
- roster cards sort by position and then pick index;
- the roster is the left sibling of the rankings scroller while the controls pane is above both;
- full bubble styling and controls are reused;
- drafted cells except the first receive 80% opacity;
- the first drafted cell stays fully opaque and dark.

The relevant Vitest suite and the production build will run after implementation.
