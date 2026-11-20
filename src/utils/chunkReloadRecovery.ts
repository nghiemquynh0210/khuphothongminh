import { lazy, type ComponentType, type LazyExoticComponent } from "react";

export const CHUNK_RELOAD_STORAGE_KEY = "kp3_chunk_reload_ts";
export const CHUNK_RELOAD_COOLDOWN_MS = 15_000;

export function isDynamicImportChunkError(error: unknown): boolean {
  if (!error) return false;
  const message =
    error instanceof Error
      ? `${error.name} ${error.message}`
      : typeof error === "string"
        ? error
        : String((error as { message?: unknown })?.message ?? error);
  const normalized = message.toLowerCase();
  return (
    normalized.includes("failed to fetch dynamically imported module") ||
    normalized.includes("importing a module script failed") ||
    normalized.includes("error loading dynamically imported module") ||
    normalized.includes("unable to preload css") ||
    normalized.includes("chunkloaderror") ||
    normalized.includes("loading chunk")
  );
}

export function tryAutoReloadForStaleChunk(
  options: {
    now?: number;
    storage?: Pick<Storage, "getItem" | "setItem"> | null;
    reload?: () => void;
    storageKey?: string;
  } = {}
): boolean {
  const now = options.now ?? Date.now();
  const storageKey = options.storageKey ?? CHUNK_RELOAD_STORAGE_KEY;
  const storage =
    options.storage !== undefined
      ? options.storage
      : typeof window !== "undefined"
        ? window.sessionStorage
        : null;
  const reload =
    options.reload ??
    (typeof window !== "undefined" ? () => window.location.reload() : undefined);

  if (!reload) return false;

  try {
    const rawPrev = storage?.getItem(storageKey);
    const prevTs = rawPrev ? Number(rawPrev) : 0;
    if (Number.isFinite(prevTs) && prevTs > 0 && now - prevTs < CHUNK_RELOAD_COOLDOWN_MS) {
      return false;
    }
    storage?.setItem(storageKey, String(now));
  } catch {
    // Ignore sessionStorage restrictions in private mode and allow a single reload attempt
  }

  reload();
  return true;
}

export function installVitePreloadErrorRecovery(): void {
  if (typeof window === "undefined") return;
  window.addEventListener("vite:preloadError", (event) => {
    event.preventDefault();
    tryAutoReloadForStaleChunk();
  });
}

export function lazyWithChunkRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>
): LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      return await factory();
    } catch (error) {
      if (isDynamicImportChunkError(error) && tryAutoReloadForStaleChunk()) {
        // Keep Suspense fallback mounted briefly while the browser reloads fresh index.html;
        // reject after 5s if navigation/reload was cancelled so ErrorBoundary can recover.
        return await new Promise<{ default: T }>((_, reject) => {
          setTimeout(() => reject(error), 5000);
        });
      }
      throw error;
    }
  });
}
