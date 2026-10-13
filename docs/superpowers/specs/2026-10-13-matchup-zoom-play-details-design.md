# Matchup chart zoom and play details

Approved by the user with yesi. Each SpiciestMatchups chart supports horizontal drag selection in either direction, a visible range highlight, and an independent Reset zoom button. Releasing a meaningful drag zooms the horizontal axis; the probability axis stays at 0–100%. Zoom may be repeated, reset restores all four chunks, and a click/tap without a drag preserves inspection. Pointer capture allows release outside the graph; canceled gestures and Escape discard selection. Horizontal touch dragging works while vertical page scrolling remains available. Zoomed axes show local timestamps and the selected range.

Keep original chunk positions and all samples so clipping preserves the curve at zoom boundaries. No probability or spice calculations change.

Carry source play metadata from reconstruction into each LeadPoint. Include NFL matchup, quarter/game clock, original text, and approximate timeline timestamp for the most recent nonzero reconstructed score contribution at or before the point. Co-timed plays are grouped and duplicates across starters are removed. Do not attribute projection decay, kickoff/end boundaries, or interpolation without play data to an invented play. The tooltip shows the sample timestamp separately from the contributing play timestamp, labels these as reconstructed contributions, and explains when no contributing play is available. Preserve raw game clocks including overtime.

Implementation: extend the data builder with event provenance without changing score math; add per-chart pointer state, highlight and reset controls; render provenance in the tooltip. Verify direction-independent and repeated zoom, reset/isolation, canceled and tiny gestures, clipping/ticks, latest past play, no zero-point attribution, simultaneous events, and no metadata leakage across matchups. Run targeted chart/data tests, TypeScript/build, and desktop browser interactions.

Self-review: scope preserves the current retrospective approximation; no claim of live scoring or precise real-world play timestamps. No new data source or ranking change.

Validation: 48 targeted chart/data tests passed; TypeScript and production build passed. Local browser verification confirmed left-to-right and right-to-left range selection, timestamp axes, independent reset controls, and original play text/game clock in the tooltip.
