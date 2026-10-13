# Grouped Wrapped navigation

Use the user's nine categories and exact child order, with one visible row per category. Preserve existing tab labels and hash routes. Each row has a fixed category label and horizontally scrollable child links, so narrow screens retain one row per category. Tint the active tab blue and expose aria-current="page" on its link; respond to direct links, clicks, and browser history through the existing hash subscription. Keep the year selector global.

The categories are CashMoney, Dunked, DoneDirty, Positions, Archive, Nerd, SuperNerd, Zodiac, and Beta. All 40 registered views appear exactly once. No view is removed or renamed. Native links support keyboard navigation and opening in a new tab, with a visible focus indicator.

Validate category coverage against the registry, run the existing navigation test and production build, then inspect desktop/narrow layouts and selected tint after changing routes. Preserve unrelated dist output. This implements the user's explicit layout specification; no additional design decision is pending.

Validation completed: all 40 views are listed exactly once, the existing navigation test and TypeScript/production build pass, and browser checks confirm nine rows, selected tint on direct load and click, correct browser Back selection, and one scrollable line per category at a narrow viewport. Screenshot: /tmp/fantasy420-grouped-navigation.png.
