const extension_id = "codiminongikfnidmdkpmeigapidedgn";

function do_send_message(payload) {
  return new Promise((resolve) =>
    chrome.runtime.sendMessage(extension_id, payload, function (response) {
      resolve(response);
    })
  );
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
