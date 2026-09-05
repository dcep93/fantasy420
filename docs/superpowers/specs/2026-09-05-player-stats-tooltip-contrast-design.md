# Player Stats Tooltip Contrast Design

## Goal

Make every line of the Wrapped Player Stats chart tooltip legible against the application's dark theme without changing the chart's data, layout, or interaction.

## Design

Keep Recharts' built-in tooltip and give each of its visual layers explicit night-theme styling:

- Use the shared tooltip background and normal text colors for the tooltip container.
- Use the normal text color for both the week label and the owner/value item so Recharts cannot fall back to its dark default item color.
- Use the shared chart-grid color for the tooltip border so the popup remains distinct from the chart canvas.

This local configuration follows the existing chart-theme pattern and avoids a global CSS rule that could unexpectedly affect other Recharts views. A custom tooltip component would provide more control but would add unnecessary markup and maintenance for a contrast-only fix.

## Verification

- Add a focused component test that asserts the tooltip receives the shared night-theme container, label, and item styles.
- Run the Player Stats chart test.
- Run the application production build to verify TypeScript and Vite compilation.
- Review the final diff for unrelated changes.
