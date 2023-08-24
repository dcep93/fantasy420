const extension_id = "codiminongikfnidmdkpmeigapidedgn";

declare global {
  interface Window {
    chrome: any;
  }
}

function extensionHelper(payload: any): Promise<any> {
  if (!window.chrome?.runtime) {
    console.log("componentDidMount", "no chrome runtime");
    return Promise.resolve([]);
  }
  return new Promise((resolve, reject) => {
    window.chrome.runtime.sendMessage(
      extension_id,
      payload,
      (response: any) => {
        if (response === undefined) return reject("empty response");
        console.log({ response });
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