# Mobile Chart Point Hit Targets

## Goal

Make discrete graph points substantially easier to tap on mobile without resizing charts, changing their layout, or redesigning their existing tooltips.

## Interaction Design

Each interactive point will retain its current visible size and appearance while gaining an invisible circular pointer target with a radius of approximately twenty-two pixels. This produces a roughly forty-four-pixel touch target around small dots and markers. The invisible target will respond to mouse, pen, and touch through pointer-compatible SVG hit testing.

When targets overlap, the browser and chart library will continue using the chart's existing point ordering and tooltip behavior. No persistent detail panel, hard chart resizing, new gesture, or tooltip repositioning will be introduced.

## Scope

The shared hit-target primitive will be applied to charts that depend on reaching a discrete SVG point:

- punt scatter plots;
- player scatter plots;
- player-stat score markers;
- manager-trend result markers; and
- spiciest-matchup probability points.

Line charts whose Recharts tooltip already activates across an entire x-axis band do not need enlarged dots for this change. Noninteractive scatter plots are also unchanged.

## Testing

Automated coverage will verify the shared invisible target's size, transparent rendering, and preservation of the visible marker. Existing graph tests, the complete frontend suite, and the production build will confirm that chart rendering and tooltip content remain intact.

