async function execute() {
  const paths = [
    {
      p: /https:\/\/fantasy\.espn\.com\/football\/draft.*/,
      jss: [
        "firebase/firebase-app.js",
        "firebase/firebase-database.js",
        "draft.js",
      ],
    },
    {
      p: /https:\/\/fantasy\.espn\.com\/football\/mockdraftlobby/,
      jss: ["mockdraftlobby.js"],
    },
    {
      p: /https:\/\/fantasy\.espn\.com\/football.*/,
      jss: ["reddit/shared.js", "reddit/inject.js"],
    },
    {
      p: /https:\/\/www\.reddit\.com\/r\/fantasyfootball\/.*/,
      jss: ["reddit/shared.js", "reddit/scrape.js"],
    },
    {
      p: /https:\/\/fantasy\.espn\.com\/football.*/,
      jss: ["vegas.js"],
    },
  ];

  const jss = paths
    .filter((o) => location.href.match(o.p))
    .flatMap((o) => o.jss);

  for (let i = 0; i < jss.length; i++) {
    await fileToPromise(jss[i]);
  }
}

function fileToPromise(fileName) {
  const url = chrome.runtime.getURL(`extensions/${fileName}`);
  if (fileName.endsWith(".txt")) {
    const d = document.createElement("data");
    d.setAttribute("id", fileName);
    document.head.appendChild(d);
    return fetch(url)
      .then((resp) => resp.text())
      .then((text) => (d.innerHTML = text));
  }
  const s = document.createElement("script");
  s.src = url;
  s.setAttribute("storage", chrome.storage);

  return new Promise((resolve, reject) => {
    s.onload = resolve;
    document.head.appendChild(s);
  });
}

execute();
