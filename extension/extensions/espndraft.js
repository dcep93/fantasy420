//////

// prettier-ignore
function getDraft() { const history = document.getElementsByClassName("pick-history")[0]; var s; if (!history) { s = window.state; } else { s = Array.from(history.getElementsByClassName("fixedDataTableCellGroupLayout_cellGroup")).map(row => ({ name_e: row.getElementsByClassName("playerinfo__playername")[0], rank_e: Array.from(row.children).reverse()[0] })).filter(_ref4 => { let { name_e, rank_e } = _ref4; return name_e && rank_e; }).map(_ref5 => { let { name_e, rank_e } = _ref5; return { name: name_e.innerText, rank: parseInt(rank_e.innerText) }; }); } const seen = Object.fromEntries(s.map(o => [o.name, true])); const recent = Array.from(document.getElementsByClassName("pick__message-content")).map(e => e.getElementsByClassName("playerinfo__playername")[0]).map(e => e.innerText).filter(name => !seen[name]).map((name, i) => ({ name, rank: s.length + 1 + i })); return s.concat(recent); }

const READ_AND_POST_PERIOD_MS = 1000;
var json_draft = null;

function espndraft() {
  console.log("ff_draft", location.href);
  save_to_storage({ draft: [] });
  readAndPostLoop();
}

function readAndPostLoop() {
  console.log("readAndPostLoop");
  const draft = getDraft();
  setTimeout(readAndPostLoop, READ_AND_POST_PERIOD_MS);
  const _json_draft = JSON.stringify(draft);
  if (json_draft === _json_draft) return;
  json_draft = _json_draft;
  save_to_storage({ draft });
}

espndraft();
