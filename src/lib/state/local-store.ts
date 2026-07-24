// Store externo minimalista respaldado por localStorage, pensado para usarse
// con useSyncExternalStore (evita setState dentro de efectos y es hydration-safe:
// el snapshot de servidor siempre es el default).
export function createLocalStorageStore<T>(key: string, defaultValue: T) {
  let value: T = defaultValue;
  let hydrated = false;
  const listeners = new Set<() => void>();

  function hydrate() {
    if (hydrated || typeof window === "undefined") return;
    hydrated = true;
    const raw = window.localStorage.getItem(key);
    if (!raw) return;
    try {
      value = JSON.parse(raw) as T;
    } catch {
      // Datos corruptos en localStorage: se ignoran y se conserva el default.
    }
  }

  function getSnapshot(): T {
    hydrate();
    return value;
  }

  function getServerSnapshot(): T {
    return defaultValue;
  }

  function subscribe(callback: () => void) {
    listeners.add(callback);
    return () => listeners.delete(callback);
  }

  function set(next: T) {
    value = next;
    hydrated = true;
    if (typeof window !== "undefined") {
      window.localStorage.setItem(key, JSON.stringify(next));
    }
    listeners.forEach((listener) => listener());
  }

  return { getSnapshot, getServerSnapshot, subscribe, set };
}
