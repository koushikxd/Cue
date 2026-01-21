import { useCallback, useEffect, useState } from "react";

const isBrowser = () =>
  typeof window !== "undefined" &&
  typeof localStorage !== "undefined" &&
  typeof localStorage.getItem === "function";

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (!isBrowser()) return;

    try {
      const item = localStorage.getItem(key);
      if (!item) return;
      setStoredValue(JSON.parse(item) as T);
    } catch (error) {
      console.error("Failed to parse localStorage:", error);
    }
  }, [key]);

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        const valueToStore =
          value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);

        if (isMounted && isBrowser()) {
          localStorage.setItem(key, JSON.stringify(valueToStore));
        }
      } catch (error) {
        console.error("Failed to save to localStorage:", error);
      }
    },
    [key, storedValue, isMounted]
  );

  return [storedValue, setValue] as const;
}
