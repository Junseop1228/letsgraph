"use client";
// 이용 기록 (specs/measurement FR-OPS-04) with PostHog. Off unless NEXT_PUBLIC_POSTHOG_KEY is set.
// No personal data is sent (no emails, no file names, no free text); failures never affect the app.
import { useEffect } from "react";
import posthog from "posthog-js";

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
let ready = false;

export function AnalyticsInit() {
  useEffect(() => {
    if (!KEY || ready) return;
    try {
      posthog.init(KEY, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
        person_profiles: "identified_only",
        capture_pageview: true,
        autocapture: false,
        disable_session_recording: true,
        persistence: "localStorage",
      });
      ready = true;
    } catch {
      /* measurement must never break the service */
    }
  }, []);
  return null;
}

/** Core actions (CoreAction). Keep names stable: they are the funnel steps in the dashboard. */
export type CoreAction =
  | "onboarding_done"
  | "graph_industry_open"
  | "graph_conditions_change"
  | "company_open"
  | "posting_analyze"
  | "connection_view"
  | "kit_copy"
  | "kit_download"
  | "checkout_open";

export function track(event: CoreAction, props?: Record<string, string | number | boolean>) {
  if (!KEY || !ready) return;
  try {
    posthog.capture(event, props);
  } catch {
    /* ignore */
  }
}
