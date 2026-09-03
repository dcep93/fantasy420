const FANTASYPROS_DRAFT_PERIOD_MS = 1000;
const FANTASYPROS_PICK_SELECTOR = ".vue-base-draft-log-cell";
const FANTASYPROS_PLAYER_NAME_SELECTOR =
  ".vue-draft-log-cell__player-name";
const FANTASYPROS_PICK_NUMBER_SELECTOR =
  ".vue-base-draft-log-cell__pick-number";

function getFantasyProsPickOrder(pickNumber) {
  const match = /^(\d+)\.(\d+)$/.exec(pickNumber.trim());
  if (!match) return null;

  const round = Number(match[1]);
  const pickWithinRound = Number(match[2]);
  if (round < 1 || pickWithinRound < 1) return null;

  return round * 1000 + pickWithinRound;
}

function getFantasyProsDraft(root) {
  const cells = Array.from(root.querySelectorAll(FANTASYPROS_PICK_SELECTOR));
  if (cells.length === 0) return null;

  const picksByOrder = new Map();
  cells.forEach((cell) => {
    const name = cell
      .querySelector(FANTASYPROS_PLAYER_NAME_SELECTOR)
      ?.getAttribute("title")
      ?.trim();
    const pickNumber = cell
      .querySelector(FANTASYPROS_PICK_NUMBER_SELECTOR)
      ?.textContent?.trim();
    const pickOrder = pickNumber ? getFantasyProsPickOrder(pickNumber) : null;

    if (name && pickOrder !== null) {
      picksByOrder.set(pickOrder, name);
    }
  });

  return Array.from(picksByOrder.entries())
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
    getFantasyProsPickOrder,
  };
}

if (typeof document !== "undefined") {
  console.log("fantasyprosdraft", location.href);
  startFantasyProsDraftSync(document);
}
