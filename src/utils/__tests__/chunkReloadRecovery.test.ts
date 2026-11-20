import { describe, expect, it, vi } from "vitest";
import {
  CHUNK_RELOAD_COOLDOWN_MS,
  isDynamicImportChunkError,
  tryAutoReloadForStaleChunk,
} from "../chunkReloadRecovery";

describe("chunkReloadRecovery", () => {
  it("detects Vite and browser dynamic import chunk errors across engines", () => {
    expect(
      isDynamicImportChunkError(
        new TypeError(
          "Failed to fetch dynamically imported module: https://bdhkp3.vercel.app/assets/TasksPage-DNwR5nn9.js"
        )
      )
    ).toBe(true);
    expect(
      isDynamicImportChunkError(new TypeError("Importing a module script failed."))
    ).toBe(true);
    expect(
      isDynamicImportChunkError(new Error("Unable to preload CSS for /assets/style-abc.css"))
    ).toBe(true);
    expect(isDynamicImportChunkError(new Error("Validation failed on form field"))).toBe(false);
    expect(isDynamicImportChunkError(null)).toBe(false);
  });

  it("reloads once and prevents infinite reload loops within the cooldown window", () => {
    const store = new Map<string, string>();
    const mockStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
    };
    const reload = vi.fn();

    // First stale chunk error triggers immediate reload
    expect(
      tryAutoReloadForStaleChunk({
        now: 100_000,
        storage: mockStorage,
        reload,
      })
    ).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);

    // Second error 2 seconds later is blocked by anti-loop guard
    expect(
      tryAutoReloadForStaleChunk({
        now: 102_000,
        storage: mockStorage,
        reload,
      })
    ).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);

    // After cooldown expires (e.g., a later deployment), reload is permitted again
    expect(
      tryAutoReloadForStaleChunk({
        now: 100_000 + CHUNK_RELOAD_COOLDOWN_MS + 1,
        storage: mockStorage,
        reload,
      })
    ).toBe(true);
    expect(reload).toHaveBeenCalledTimes(2);
  });
});
