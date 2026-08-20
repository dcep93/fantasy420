declare global {
  interface Window {
    chrome: any;
  }
}

function getExtensionId(): string | null {
  return document.documentElement.dataset.fantasy420ExtensionId || null;
}

function extensionHelper(payload: any): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!window.chrome?.runtime) {
      return reject("no chrome runtime");
    }
    const extensionId = getExtensionId();
    if (!extensionId) {
      return reject("Fantasy420 extension unavailable");
    }
    window.chrome.runtime.sendMessage(
      extensionId,
      payload,
      (response: any) => {
        if (response === undefined) {
          const runtimeError = window.chrome.runtime.lastError;
          return reject(runtimeError?.message || "empty response");
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
