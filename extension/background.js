console.log("background 0.0.2");

const fetch_cache = {};

chrome.runtime.onMessageExternal.addListener(function (
  request,
  _,
  sendResponse
) {
  console.log(request);
  if (request.init) {
    sendResponse();
    return false;
  }
  if (request.storage) {
    if (request.storage.action === "get") {
      chrome.storage.local.get(request.storage.keys, (result) => {
        sendResponse(result);
      });
    }
    if (request.storage.action === "save") {
      chrome.storage.local.set(request.storage.save, () => sendResponse(true));
    }
    return true;
  }
  if (request.fetch) {
    const cached = fetch_cache[request.fetch.url];
    const now = Date.now();
    if (now - cached?.timestamp < request.fetch.maxAgeMs) {
      sendResponse(cached.resp);
    } else {
      fetch(request.fetch.url, request.fetch.options)
        .then((resp) => {
          if (!resp.ok) {
            return resp
              .text()
              .catch(() => "")
              .then((body) => {
                const status = [resp.status, resp.statusText]
                  .filter(Boolean)
                  .join(" ");
                const details = body ? `: ${body.slice(0, 200)}` : "";
                throw new Error(`HTTP ${status}${details}`);
              });
          }
          return request.fetch.json ? resp.json() : resp.text();
        })
        .then((resp) => {
          fetch_cache[request.fetch.url] = { timestamp: now, resp };
          return resp;
        })
        .then(sendResponse)
        .catch((err) => {
          console.trace(err);
          sendResponse({
            error: err instanceof Error ? err.message : String(err),
          });
        });
    }
    return true;
  }
  return false;
});
