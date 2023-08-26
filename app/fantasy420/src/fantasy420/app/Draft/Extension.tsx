const extension_id = "codiminongikfnidmdkpmeigapidedgn";

declare global {
  interface Window {
    chrome: any;
  }
}

function extensionHelper(payload: any): Promise<any> {
  if (!window.chrome?.runtime) {
    alert(11);
    console.log("componentDidMount", "no chrome runtime");
    return Promise.resolve([]);
  }
  return new Promise((resolve, reject) => {
    alert(16);
    window.chrome.runtime.sendMessage(
      extension_id,
      payload,
      (response: any) => {
        alert(21);
        if (response === undefined) return reject("empty response");
        alert(23);
        resolve(response);
      }
    );
  }).catch((err: Error) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    window.chrome.runtime.lastError;
    console.log("fetchExtensionStorage", "extension not detected:", err);
    throw err;
  });
}

export function fetchExtensionStorage(key: string): Promise<any> {
  return extensionHelper({ storage: { action: "get", keys: [key] } }).then(
    (response) => {
      return response ? response[key] : {};
    }
  );
}
