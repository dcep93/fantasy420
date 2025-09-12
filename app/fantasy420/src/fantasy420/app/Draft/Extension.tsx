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

export function fetchExtension(request: {
  url: string;
  json: boolean;
  maxAgeMs: number;
  options?: any;
}): Promise<any> {
  return extensionHelper({ fetch: request });
}

export function fetchExtensionStorage(key: string): Promise<any> {
  return extensionHelper({ storage: { action: "get", keys: [key] } }).then(
    (response) => {
      return response ? response[key] : null;
    }
  );
}

export function setExtensionStorage(save: {
  [key: string]: any;
}): Promise<any> {
  return extensionHelper({ storage: { action: "save", save } }).then((resp) => {
    console.log({ resp });
  });
}
