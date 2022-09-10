const extension_id = "codiminongikfnidmdkpmeigapidedgn";

function do_send_message(payload) {
  return new Promise((resolve) =>
    chrome.runtime.sendMessage(extension_id, payload, function (response) {
      resolve(response);
    })
  );
}

function get_from_storage() {
  return _do_storage({ action: "get", keys: ["reddit"] }).then((response) => {
    return response?.reddit || {};
  });
}

function save_to_storage(reddit) {
  return _do_storage({ action: "save", save: { reddit } });
}

function _do_storage(storage) {
  return do_send_message({ storage });
}
