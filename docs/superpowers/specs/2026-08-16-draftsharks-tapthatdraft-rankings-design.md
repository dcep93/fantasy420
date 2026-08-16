# DraftSharks and Tap That Draft 2026 Rankings Design

## Goal

Add complete 2026 DraftSharks and Tap That Draft rankings to the existing draft board. Both imports must retain the legacy `source -> player name -> numeric value` JSON format and render as independent sources on `/draft`.

## Source variants

- Capture the complete rendered DraftSharks PPR superflex auction table visible in the authenticated Chrome session. Store its auction values under `draftsharks_ppr_super_auction`.
- Generate a Tap That Draft sheet configured for 10 teams, full PPR, superflex, auction, and a $200 budget. Store its complete auction list under `tapthatdraft_10_ppr_super_auction`.
- Do not add redundant ordinal variants from either domain in this update.

## Data handling

Player names will receive only compatibility normalization needed to match the 2026 wrapped player pool. Auction prices will be stored as negative numbers so higher prices sort first in the current draft UI. Source order and dollar values will otherwise remain unchanged.

## Validation

The ranking test will require both new source keys, numeric values, non-positive auction prices, and entry counts consistent with the complete rendered lists. The full frontend test suite and production build must pass. A browser smoke test will confirm that both new source tabs and their player rows render on `/draft` through the existing password gate.

## Delivery

After verification, commit the data and test changes and push the follow-up commit to `origin/main`, as requested.
