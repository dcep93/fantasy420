# Matchup details below the graph

The user explicitly requested removing the tooltip from on top of the graph. Move its existing information into a normal-flow panel below each chart. Keep the chart cursor and active point; use Recharts active payload to update the panel without rendering an overlay. Retain the last inspected point after pointer exit so details can be read or copied. Each chart owns its own selection. Clear stale details when its data changes. Preserve zoom, probability scale, and all score/play information.

Use a responsive layout for the two fantasy teams and contributing play details. Start with a short hover/tap prompt and reserve panel space to reduce layout shifts. Verify pointer inspection and exit, below-graph geometry, zoom/reset, and build/type correctness. This is independent of the previously explained historical missing-projection problem, which has not been requested as a fix.

Validation: 15 chart tests and production build passed. Browser inspection confirmed the details panel begins 12 pixels below the plot and retains identical details after pointer exit; the graph remains unobstructed.
