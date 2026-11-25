# Restore Vegas pregame history

The user authorized fixing the previously diagnosed missing kickoff date and will
reload the Chrome extension after verification.

Carry each navigation event's kickoff and name through the category responses to
the player records. Keep the existing `vegas[player][startDate]` storage format:
the latest observed pregame projection replaces that game's entry, and other
games and players remain intact. Store event identity and the unadjusted decimal
anytime-touchdown price alongside the existing calculated scores. Continue saving
players present on the ESPN Fantasy page; collecting every fetched player would
change the scope of the existing feature.

Saving must not depend on whether the overlay's text changed. Skip empty or
unchanged snapshots and games that have started or have invalid dates. Mark a
snapshot saved only after a successful storage response. Report storage failures
and retry on the next polling cycle without stopping the overlay loop. Preserve
the background handler's asynchronous response behavior and propagate actual
Chrome storage errors.

A date-only patch would restore the main path but retain failed-write suppression
and lose the original touchdown price. A separate full raw-response archive would
add storage and lifecycle complexity beyond this repair. The selected approach
keeps the existing history and UI while making its writes verifiable.

Verification uses deterministic mocked DraftKings responses, ESPN player elements,
and asynchronous Chrome storage: future games save the correct date and exact
price; old entries survive; past/invalid dates do not save; failed writes retry
even after the overlay is rendered; unchanged successful writes are skipped.
Run the existing extension tests and JavaScript syntax checks. No live sportsbook
or user storage will be modified during testing. Reload verification remains for
the user's Chrome session; historical unsaved prices cannot be reconstructed.
