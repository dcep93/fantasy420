//////

function getDraft() {
  return Array.from(document.getElementsByClassName("pick__message-content"))
    .map((row) => row.getElementsByClassName("playerinfo__playername")[0])
    .filter((nameE) => nameE)
    .map((nameE) => nameE.innerText);
}

const READ_AND_POST_PERIOD_MS = 1000;
var json_draft = null;

function espndraft() {
  console.log("espndraft", location.href);
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
