declare global {
  interface Window {
    chrome: any;
  }
}

function getExtensionId(): string | null {
  return document.documentElement.dataset.fantasy420ExtensionId || null;
}

const EXTENSION_ID_POLL_MS = 50;
const EXTENSION_ID_TIMEOUT_MS = 3000;

function waitForExtensionId(): Promise<string> {
  const existingId = getExtensionId();
  if (existingId) return Promise.resolve(existingId);

  return new Promise((resolve, reject) => {
    let elapsedMs = 0;
    const interval = window.setInterval(() => {
      const extensionId = getExtensionId();
      if (extensionId) {
        window.clearInterval(interval);
        resolve(extensionId);
        return;
      }

      elapsedMs += EXTENSION_ID_POLL_MS;
      if (elapsedMs >= EXTENSION_ID_TIMEOUT_MS) {
        window.clearInterval(interval);
        reject("Fantasy420 extension unavailable");
      }
    }, EXTENSION_ID_POLL_MS);
  });
}

function extensionHelper(payload: any): Promise<any> {
  if (!window.chrome?.runtime) {
    return Promise.reject("no chrome runtime");
  }

  return waitForExtensionId().then(
    (extensionId) =>
      new Promise((resolve, reject) => {
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
      })
  );
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
  return fetchExtensionStorageValues([key]).then((response) =>
    response ? response[key] : null
  );
}

export function fetchExtensionStorageValues(
  keys: string[]
): Promise<Record<string, any>> {
  return extensionHelper({ storage: { action: "get", keys } }).then(
    (response) => response ?? {}
  );
}

export function setExtensionStorage(save: {
  [key: string]: any;
}): Promise<any> {
  return extensionHelper({ storage: { action: "save", save } }).then((resp) => {
    console.log({ resp });
  });
}
