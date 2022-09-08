console.log("background");

chrome.runtime.onMessageExternal.addListener(function (
  request,
  _,
  sendResponse
) {
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
});
