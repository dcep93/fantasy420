# SpiciestMatchups week filter

Add a labeled Week dropdown beside the SpiciestMatchups heading. Default to All weeks, with numeric weeks from the selected seasons' matchup schedules in ascending order. A single-week selection filters across the current year scope, including All years, before sorting and limiting to ten. Keep the existing 25-spice qualification threshold. Reset to All weeks when the year scope changes.

Retain the full analyzed matchup pool after loading so changing weeks is immediate and does not fetch or reconstruct timelines again. Derive the displayed rankings and counts from that pool. Keep unavailable-season and projection-omission notices, explicitly labeling omission counts as covering all weeks. Show the existing empty-selection messages when a week has no eligible or qualifying games.

A dropdown follows the existing year control, avoids invalid week input, and takes less space than week buttons. Verify selection, clearing, year changes, and a selected-week matchup outside the overall top ten; run the existing relevant tests and build, inspect the browser, then commit and push.
