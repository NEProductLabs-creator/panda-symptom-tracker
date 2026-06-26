import posthog from 'posthog-js';

const key = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const host = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ?? 'https://us.i.posthog.com';

export const ANALYTICS_CONSENT_KEY = 'pans_tracker_analytics_consent';

export const analyticsReady = Boolean(key);

export function initAnalytics(): void {
  if (!key) return;
  if (localStorage.getItem(ANALYTICS_CONSENT_KEY) !== '1') return;
  posthog.init(key, {
    api_host: host,
    person_profiles: 'identified_only',
    capture_pageview: false,
    capture_pageleave: false,
    autocapture: false,
    disable_session_recording: true,
    disable_surveys: true,
  });
}

export function enableSurveys(): void {
  if (!analyticsReady) return;
  posthog.config.disable_surveys = false;
}

// ─── Identity ─────────────────────────────────────────────────────────────────

const DEMO_SESSION_KEY = 'pans_demo_analytics_id';

function getDemoId(): string {
  let id = sessionStorage.getItem(DEMO_SESSION_KEY);
  if (!id) {
    id = `demo_${crypto.randomUUID()}`;
    sessionStorage.setItem(DEMO_SESSION_KEY, id);
  }
  return id;
}

export function identifyUser(clerkId: string): void {
  if (!analyticsReady) return;
  posthog.identify(clerkId);
}

export function identifyAsDemo(): void {
  if (!analyticsReady) return;
  posthog.identify(getDemoId());
}

export function resetIdentity(): void {
  if (!analyticsReady) return;
  posthog.reset();
}

// ─── Events ───────────────────────────────────────────────────────────────────

export type AnalyticsEvent =
  | 'landing_page_viewed'
  | 'landing_cta_create_account'
  | 'landing_cta_login'
  | 'landing_cta_demo'
  | 'demo_viewed'
  | 'demo_cta_clicked'
  | 'demo_save_prompt_shown'
  | 'demo_save_prompt_converted'
  | 'signup_started'
  | 'signup_completed'
  | 'onboarding_started'
  | 'onboarding_completed'
  | 'symptom_log_created'
  | 'ptec_checkin_completed'
  | 'export_triggered'
  | 'share_link_created'
  | 'pwa_install_prompt_shown'
  | 'pwa_install_accepted'
  | 'pwa_install_dismissed'
  | 'push_reminder_enabled_from_nudge'
  | 'push_reminder_nudge_dismissed'
  | 'csv_exported'
  | 'onboarding_journey_stage_selected'
  | 'onboarding_add_child_skipped'
  | 'screener_landing_cta_clicked'
  | 'screener_started'
  | 'screener_step_completed'
  | 'screener_completed'
  | 'screener_abandoned'
  | 'screener_retaken'
  | 'learn_section_viewed'
  | 'learn_self_check_started'
  | 'learn_self_check_completed'
  | 'learn_self_check_pdf_downloaded'
  | 'right_now_section_viewed'
  | 'right_now_today_action_completed'
  | 'right_now_er_guide_viewed'
  | 'advocate_section_viewed'
  | 'advocate_report_generated'
  | 'advocate_script_copied'
  | 'demo_scenario_selected'
  | 'demo_scenario_action'
  | 'child_added'
  | 'child_switched'
  | 'child_archived'
  | 'child_unarchived'
  | 'child_edited'
  | 'demo_child_switched'
  | 'api_fetch_failed'
  | 'add_child_tip_shown'
  | 'add_child_tip_clicked'
  | 'add_child_tip_dismissed'
  | 'settings_children_clicked'
  | 'add_child_from_onboarding';

export function track(event: AnalyticsEvent, properties?: Record<string, unknown>): void {
  if (!analyticsReady) return;
  posthog.capture(event, properties);
}
