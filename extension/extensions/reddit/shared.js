const extension_id = "codiminongikfnidmdkpmeigapidedgn";

function get_from_storage() {
  return _do_storage({ action: "get", keys: ["reddit"] });
}

function save_to_storage(reddit) {
  return _do_storage({ action: "save", save: { reddit } }).then((response) => {
    if (response.reddit) return response.reddit;
    throw new Error(response);
  });
}

function _do_storage(storage) {
  return new Promise((resolve) =>
    chrome.runtime.sendMessage(extension_id, { storage }, function (response) {
      resolve(response);
    })
  );
}
