"use client";
// Demo-mode state kept in the browser (no account needed). With Supabase enabled, the same
// hooks are seeded from the server and changes also go to server actions (added with login).
import { useCallback, useEffect, useState } from "react";

const KEY_WATCHED = "lg:watched";
const KEY_JOB = "lg:primary-job";
const KEY_LIKED = "lg:liked-jobs";

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
  // Sync from browser storage after hydration (server HTML uses `initial`, so this cannot be a lazy initial state).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setIds(read(KEY_WATCHED, initial)), [initial]);
  const toggle = useCallback((id: string) => {
    setIds((cur) => {
      const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
      write(KEY_WATCHED, next);
      return next;
    });
  }, []);
  return { ids, has: (id: string) => ids.includes(id), toggle };
}

export function savePrimaryJob(jobId: string, liked: string[]) {
  write(KEY_JOB, jobId);
  write(KEY_LIKED, liked);
  document.cookie = `lg_job=${encodeURIComponent(jobId)}; path=/; max-age=31536000; samesite=lax`;
}

export function readLikedJobs(): string[] {
  return read<string[]>(KEY_LIKED, []);
}
