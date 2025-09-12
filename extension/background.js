console.log("background 1.0.0");

const fetch_cache = {};

chrome.runtime.onMessageExternal.addListener(function (
  request,
  _,
  sendResponse
) {
  console.log(request);
  if (request.init) sendResponse();
  if (request.storage) {
    if (request.storage.action === "get") {
      chrome.storage.local.get(request.storage.keys, (result) => {
        sendResponse(result);
      });
    }
    if (request.storage.action === "save") {
      chrome.storage.local.set(request.storage.save, () => sendResponse(true));
    }
  }
  if (request.fetch) {
    const cached = fetch_cache[request.fetch.url];
    const now = Date.now();
    if (now - cached?.timestamp < request.fetch.maxAgeMs)
      return sendResponse(cached.resp);
    return fetch(request.fetch.url, request.fetch.options)
      .then((resp) => (request.fetch.json ? resp.json() : resp.text()))
      .then((resp) => {
        fetch_cache[request.fetch.url] = { timestamp: now, resp };
        return resp;
      })
      .then(sendResponse)
      .catch((err) => console.trace(err));
  }
});
