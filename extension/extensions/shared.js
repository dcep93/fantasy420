function get_fantasy420_extension_id() {
  return document.documentElement?.dataset?.fantasy420ExtensionId || null;
}

function do_send_message(payload) {
  return new Promise((resolve, reject) => {
    const extensionId = get_fantasy420_extension_id();
    if (!extensionId) {
      reject(new Error("Fantasy420 extension unavailable"));
      return;
    }

    chrome.runtime.sendMessage(extensionId, payload, function (response) {
      if (response === undefined) {
        reject(
          new Error(chrome.runtime.lastError?.message || "empty response")
        );
        return;
      }
      resolve(response);
    });
  });
}

function get_from_storage(key) {
  return _do_storage({ action: "get", keys: [key] }).then((response) => {
    return response ? response[key] : {};
  });
}

function save_to_storage(save) {
  return _do_storage({ action: "save", save });
}

function _do_storage(storage) {
  return do_send_message({ storage });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { do_send_message, get_fantasy420_extension_id };
}
