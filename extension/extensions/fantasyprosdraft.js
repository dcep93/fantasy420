const FANTASYPROS_DRAFT_PERIOD_MS = 1000;
const FANTASYPROS_TEAM_SELECTOR = ".vue-draft-board-team-heading";
const FANTASYPROS_PICK_SELECTOR =
  ".vue-draft-board-player-cell-contents";
const FANTASYPROS_PLAYER_NAME_SELECTOR =
  ".vue-draft-board-player-cell-contents__name";
const FANTASYPROS_PICK_NUMBER_SELECTOR =
  ".vue-draft-board-player-cell-contents__pick-number";

function getFantasyProsOverallPick(pickNumber, teamCount) {
  const match = /^(\d+)\.(\d+)$/.exec(pickNumber.trim());
  if (!match || teamCount < 1) return null;

  const round = Number(match[1]);
  const draftSlot = Number(match[2]);
  if (round < 1 || draftSlot < 1 || draftSlot > teamCount) return null;

  const pickInRound =
    round % 2 === 1 ? draftSlot : teamCount - draftSlot + 1;
  return (round - 1) * teamCount + pickInRound;
}

function getFantasyProsDraft(root) {
  const teamCount = root.querySelectorAll(FANTASYPROS_TEAM_SELECTOR).length;
  if (teamCount === 0) return null;

  const picksByOverall = new Map();
  Array.from(root.querySelectorAll(FANTASYPROS_PICK_SELECTOR)).forEach((cell) => {
    const name = cell
      .querySelector(FANTASYPROS_PLAYER_NAME_SELECTOR)
      ?.getAttribute("title")
      ?.trim();
    const pickNumber = cell
      .querySelector(FANTASYPROS_PICK_NUMBER_SELECTOR)
      ?.textContent?.trim();
    const overallPick = pickNumber
      ? getFantasyProsOverallPick(pickNumber, teamCount)
      : null;

    if (name && overallPick !== null) {
      picksByOverall.set(overallPick, name);
    }
  });

  return Array.from(picksByOverall.entries())
    .sort(([a], [b]) => a - b)
    .map(([, name]) => name);
}

function startFantasyProsDraftSync(root) {
  let previousDraftJson = null;

  function readAndPostLoop() {
    const draft = getFantasyProsDraft(root);
    if (draft !== null) {
      const draftJson = JSON.stringify(draft);
      if (draftJson !== previousDraftJson) {
        save_to_storage({ draft })
          .then((saved) => {
            if (saved === true) previousDraftJson = draftJson;
          })
          .catch((err) => console.error("FantasyPros draft sync failed", err));
      }
    }

    setTimeout(readAndPostLoop, FANTASYPROS_DRAFT_PERIOD_MS);
  }

  readAndPostLoop();
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    getFantasyProsDraft,
    getFantasyProsOverallPick,
  };
}

if (typeof document !== "undefined") {
  console.log("fantasyprosdraft", location.href);
  startFantasyProsDraftSync(document);
}
