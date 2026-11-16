"use client";
// Demo-mode state kept in the browser (no account needed). With Supabase enabled, the same
// hooks are seeded from the server and changes also go to server actions (added with login).
import { useCallback, useEffect, useState } from "react";

const KEY_WATCHED = "lg:watched";
const KEY_JOB = "lg:primary-job";
const KEY_LIKED = "lg:liked-jobs";
const WATCHED_EVENT = "lg:watched-change";

function read<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* storage unavailable: keep in memory only */
  }
}

export function useWatched(initial: string[]) {
  const [ids, setIds] = useState<string[]>(initial);
  // Sync from browser storage after hydration (server HTML uses `initial`, so this cannot be a lazy initial state),
  // and again when another part of the page or another tab changes the list (the header bell follows saves, audit C-2).
  useEffect(() => {
    const sync = () => setIds(read(KEY_WATCHED, initial));
     
    sync();
    window.addEventListener(WATCHED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(WATCHED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [initial]);
  const toggle = useCallback((id: string) => {
    setIds((cur) => {
      const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
      write(KEY_WATCHED, next);
      return next;
    });
    setTimeout(() => window.dispatchEvent(new Event(WATCHED_EVENT)), 0); // after the write above
  }, []);
  return { ids, has: (id: string) => ids.includes(id), toggle };
}

/**
 * A list of ids kept in this browser (graph add / hide, D 2026-11-17 D4). Read after hydration, so the server HTML and
 * the first client render agree.
 */
export function useIdList(key: string) {
  const [ids, setIds] = useState<string[]>([]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- browser storage is only readable after hydration
  useEffect(() => setIds(read<string[]>(key, [])), [key]);
  const add = useCallback(
    (id: string) =>
      setIds((cur) => {
        if (cur.includes(id)) return cur;
        const next = [...cur, id];
        write(key, next);
        return next;
      }),
    [key],
  );
  const remove = useCallback(
    (id: string) =>
      setIds((cur) => {
        const next = cur.filter((x) => x !== id);
        write(key, next);
        return next;
      }),
    [key],
  );
  const clear = useCallback(() => {
    write(key, []);
    setIds([]);
  }, [key]);
  return { ids, has: (id: string) => ids.includes(id), add, remove, clear };
}

export function savePrimaryJob(jobId: string, liked: string[]) {
  write(KEY_JOB, jobId);
  write(KEY_LIKED, liked);
  document.cookie = `lg_job=${encodeURIComponent(jobId)}; path=/; max-age=31536000; samesite=lax`;
}

export function readLikedJobs(): string[] {
  return read<string[]>(KEY_LIKED, []);
}
