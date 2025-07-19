const extension_id = "dikaanhdjgmmeajanfokkalonmnpfidm";

declare global {
  interface Window {
    chrome: any;
  }
}

function extensionHelper(payload: any): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!window.chrome?.runtime) {
      return reject("no chrome runtime");
    }
    window.chrome.runtime.sendMessage(
      extension_id,
      payload,
      (response: any) => {
        if (response === undefined) {
          // eslint-disable-next-line @typescript-eslint/no-unused-expressions
          window.chrome.runtime.lastError;
          return reject("empty response");
        }
        resolve(response);
      }
    );
  });
}

export function fetchExtensionStorage(key: string): Promise<any> {
  return extensionHelper({ storage: { action: "get", keys: [key] } }).then(
    (response) => {
      return response ? response[key] : null;
    }
  );
}
