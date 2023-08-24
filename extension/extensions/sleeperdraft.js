const SLEEPERDRAFT_PERIOD_MS = 1000;
var json_draft = null;
function sleeperdraft() {
  console.log("fetching sleeperdraft");
  fetch("https://sleeper.com/graphql", {
    headers: {
      "content-type": "application/json",
    },
    body: `{\"operationName\":\"get_draft\",\"variables\":{},\"query\":\"query get_draft {draft_picks(draft_id: \\\"${
      location.href.split("/").reverse()[0].split("?")[0]
    }\\\") {metadata}}\"}`,
    method: "POST",
  })
    .then((resp) => resp.json())
    .then((resp) =>
      resp.data.draft_picks
        .map((pick) => pick.metadata)
        .map((metadata) => `${metadata.first_name} ${metadata.last_name}`)
    )
    .then((draft) => {
      setTimeout(sleeperdraft, SLEEPERDRAFT_PERIOD_MS);
      const _json_draft = JSON.stringify(draft);
      if (json_draft === _json_draft) return;
      json_draft = _json_draft;
      console.log("saving sleeperdraft", draft);
      save_to_storage({ draft });
    });
}

sleeperdraft();
