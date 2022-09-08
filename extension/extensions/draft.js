/// firebase functions

function getDb(project) {
    var config = {
        databaseURL: `https://${project}-default-rtdb.firebaseio.com/`,
    };
    firebase.initializeApp(config);
    return firebase.database();
}

function listen(db, path, f) {
    const listenerRef = db.ref(path);
    listenerRef.on("value", function(snapshot) {
        var val = snapshot.val();
        f(val);
    });
}

function post(db, path, val) {
    Promise.resolve()
        .then(() => db.ref(path).set(val))
        .catch(alert);
}

//////

// prettier-ignore
function getDraft() { const history = document.getElementsByClassName("pick-history")[0]; var s; if (!history) { s = window.state; } else { s = Array.from(history.getElementsByClassName("fixedDataTableCellGroupLayout_cellGroup")).map(row => ({ name_e: row.getElementsByClassName("playerinfo__playername")[0], rank_e: Array.from(row.children).reverse()[0] })).filter(_ref4 => { let { name_e, rank_e } = _ref4; return name_e && rank_e; }).map(_ref5 => { let { name_e, rank_e } = _ref5; return { name: name_e.innerText, rank: parseInt(rank_e.innerText) }; }); } const seen = Object.fromEntries(s.map(o => [o.name, true])); const recent = Array.from(document.getElementsByClassName("pick__message-content")).map(e => e.getElementsByClassName("playerinfo__playername")[0]).map(e => e.innerText).filter(name => !seen[name]).map((name, i) => ({ name, rank: s.length + 1 + i })); return s.concat(recent); }

const READ_AND_POST_PERIOD_MS = 1000;
var state = [];

function main() {
    console.log("ff_draft", location.href);
    const db = getDb("react420");
    listen(db, "/ff/draft", receiveUpdate);
    post(db, "/ff", { draft: [] });
    readAndPostLoop(db);
}

function receiveUpdate(val) {
    console.log(val);
    if (val) state = val;
}

function readAndPostLoop(db) {
    console.log("readAndPostLoop");
    const draft = getDraft();
    if (draft.length !== (state || []).length) post(db, "/ff", { draft });
    setTimeout(() => readAndPostLoop(db), READ_AND_POST_PERIOD_MS);
}

main();