# Signed square-root probability axis

The user specified and requested the visual transform f(p) = 0.5 + sign(p - 0.5) × 0.5 × sqrt(abs(p - 0.5) / 0.5). Apply that exact transform to chart positions only. Keep original win probabilities for tooltips and label the nonlinear axis with actual probabilities, using ticks at 0, 25, 40, 50, 60, 75, and 100 percent. The center, endpoints, favorite colors, horizontal zoom, reconstruction, and spice calculation retain their existing meaning.

Add concise visible copy explaining that the square-root scale emphasizes changes near 50%. Verify the user's examples, symmetry, endpoints, increasing order, true-probability tick labels, and unmodified tooltip values. Run targeted chart tests, TypeScript/build, and inspect the rendered chart.

Self-review: the explicit formula supplies the design; this is a display change and must never rewrite probabilities as odds or alter ranking.

Validation: all 14 chart tests passed, including existing zoom/reset coverage. TypeScript and production build passed. Browser inspection confirmed nonlinear tick spacing, amplified movement near 50%, and unchanged tooltip probabilities.
