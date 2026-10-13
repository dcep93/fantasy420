# Fit probability axis when zooming

The user wants a zoomed SpiciestMatchups timeline to use most of the chart height. Keep the existing square-root probability scale, but fit its Y domain to the visible line, including interpolated values where the zoom cuts through a segment. Pad the actual probability range by 10% (at least half a percentage point), round outward to readable ticks, and clamp to 0–100%. Flat windows must have a nonzero domain.

Recompute for each nested zoom; Reset zoom restores the existing full-week domain and ticks. Keep the blue/orange transition at the actual 50% location in the new domain, and only draw the 50% reference when visible. Drag selection spans the fitted domain. Full-week data, probabilities, ranking, and hover details stay unchanged.

Verify interior extrema, interpolated edges, windows without sampled points, flat/end-point windows, gradient alignment, nested zoom, and reset. Run the chart tests and build, inspect an actual zoom in the browser, capture evidence, commit and push.
