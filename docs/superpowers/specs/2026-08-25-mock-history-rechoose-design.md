# Mock History Rechoose Design

## Goal

Make historical edits return control at the next user decision instead of silently preserving old user choices. Also reduce the default mock roster from five bench slots to two.

## Arrow edits

The better and worse arrows continue to replace their selected historical pick with the adjacent player who was available at that moment. After the replacement, discard all later history and deterministically simulate only consecutive opponent picks. Stop as soon as the draft reaches the user's next turn, leaving the draft waiting for a new table selection.

If the arrow-edited pick belongs to the user, that adjacent player is the replacement choice for that turn; opponent replay begins after it and stops at the following user turn. If the edited pick belongs to an opponent, replay begins immediately after it and stops at the first user turn. Snake-draft back-to-back user turns therefore stop without inserting another choice.

The replay uses the existing opponent ranking, starter-slot rule, risk settings, craziness, and seed behavior. It no longer attempts to preserve any later user pick.

## Clicking the center rank

For user-owned picks only, render the `#rank` between the arrows as a button. Clicking it removes that user pick and every later pick, leaving the draft waiting at that exact user turn so the user can select again from the player table. The click must not toggle board ordering.

Opponent center ranks remain non-interactive text. The arrows remain available on both user and opponent picks under their existing adjacent-player availability rules.

## Default roster

New mock drafts default to two bench slots. With the existing nine starting slots and no default DST or kicker, the default draft has eleven rounds. Loaded draft hashes keep their encoded roster settings, including older five-bench drafts. The historical calibration retains its explicit five-bench historical roster and fourteen-round sample.

## Verification

Pure simulator tests will cover opponent-edit replay stopping at the next user turn, user-edit replay stopping at the following user turn, snake-turn boundaries, and center-rank rewind. Component tests will verify that only user ranks are clickable and that their click invokes rewind without toggling board order. Default setup and draft-length tests will expect two bench slots and eleven rounds. The full frontend suite, historical calibration command, and production build must pass.
