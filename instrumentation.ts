export function register() {
  if (typeof window !== "undefined") return;
  const storage = globalThis.localStorage as
    | { getItem?: unknown }
    | undefined;
  if (!storage || typeof storage.getItem === "function") return;
  globalThis.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
    key: () => null,
    length: 0,
  } as Storage;
}
