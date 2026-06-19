# CycleCare

CycleCare is a menstrual cycle, ovulation, and fertility tracking web app built with vanilla HTML/CSS/JS on the frontend and Supabase as the backend. It calculates cycle predictions live from logged period history, sends reminders, and supports installation as a PWA.

## Features

- **Cycle calculation engine** — live-calculated (not cached/stale) cycle day, days until next period, ovulation date, and fertile window, derived from real period history rather than a single fixed input.
- **Period logging** — start/close flow that supports an in-progress period (no end date yet) and automatically recalculates averages and consistency from logged history.
- **Symptom logging** — quick tap-to-select symptom picker, saved per day.
- **Reminders** — toggle-based settings (period, ovulation, medication, hydration) backed by a single source of truth (`cycle_settings`), reflected live on the dashboard.
- **Calendar view** — visual markers for logged periods, fertile window, ovulation day, and predicted next period.
- **Empty states** — new users see clear “no data yet” prompts instead of placeholder/demo data, with one-time nudge notifications guiding setup.
- **Automated notifications** — a Supabase Edge Function (scheduled via `pg_cron`, every 15 minutes) checks each user’s data in their own timezone and creates in-app notifications for:
  - Period reminders (2 days out, due today, or late)
  - Ovulation day and fertile window start
  - Medication and hydration reminders at the user’s chosen time
- **Push notifications** — delivered via OneSignal. Confirmed working on Android/desktop browsers. iOS Safari has a known WebKit-level limitation (see *Known Issues*).
- **PWA support** — installable to a phone’s home screen via `manifest.json` and a service worker, without the iOS “edge-to-edge” mode that can hide content behind the notch/status bar.

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript (no framework)
- **Backend:** [Supabase](https://supabase.com) — Postgres, Auth, Edge Functions, `pg_cron`
- **Push/Email:** [OneSignal](https://onesignal.com)
- **Hosting:** Vercel

## Database Tables

|Table                |Purpose                                                           |
|---------------------|------------------------------------------------------------------|
|`cycle_profile`      |User profile, goal, timezone, onboarding status                   |
|`cycle_period_logs`  |Logged period start/end dates and lengths                         |
|`cycle_cycle_stats`  |Current cycle predictions (ovulation, fertile window, next period)|
|`cycle_symptoms`     |Logged daily symptoms                                             |
|`cycle_notifications`|In-app notification feed                                          |
|`cycle_settings`     |Reminder toggles and reminder time                                |

## Edge Functions

### `daily-cycle-notifications`

Runs on a schedule (every 15 minutes via `pg_cron` + `pg_net`). For each user:

- Computes “today” and the local hour in their own timezone (`cycle_profile.timezone`)
- Checks period/ovulation/fertile-window triggers during their local morning window
- Checks medication/hydration triggers against their chosen `reminder_time`
- Inserts a deduplicated notification row (one per trigger, per day)
- Sends a push notification via OneSignal

## Setup

1. Create a Supabase project and the tables listed above.
1. **Enable Row Level Security on every `cycle_*` table** and add policies so users can only read/write their own rows. *(See Known Issues — confirm this before going live.)*
1. Enable the `pg_cron` and `pg_net` extensions in Supabase (Database → Extensions).
1. Set Edge Function secrets:
   
   ```bash
   supabase secrets set ONESIGNAL_APP_ID=your_app_id
   supabase secrets set ONESIGNAL_API_KEY=your_rest_api_key
   ```
1. Deploy the Edge Function:
   
   ```bash
   supabase functions deploy daily-cycle-notifications
   ```
1. Schedule the cron job (SQL editor):
   
   ```sql
   select cron.schedule(
     'daily-cycle-notifications-job',
     '*/15 * * * *',
     $$
     select net.http_post(
       url := 'https://YOUR_PROJECT.supabase.co/functions/v1/daily-cycle-notifications',
       headers := jsonb_build_object('Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY')
     );
     $$
   );
   ```
1. Set up a OneSignal Web Push app, add the SDK + `OneSignalSDKWorker.js` to the site root, and add `manifest.json` + icons for PWA install support.

## Known Issues / Roadmap

- **Row Level Security** should be reviewed and confirmed on all `cycle_*` tables before any real user data is stored — without it, the public anon key alone could allow cross-user data access.
- **iOS Safari web push** is unreliable due to a WebKit-level bug where notification permission is granted but no push token is ever created, even with a correct implementation. This is a platform limitation, not specific to this app or to OneSignal. In-app notifications (the bell icon) work correctly on all platforms regardless. A native wrapper (e.g. Capacitor) would resolve this fully if push reliability on iPhone becomes critical.
- **Email fallback channel** (via OneSignal’s email channel, sidesteps the iOS push issue entirely) is implemented in the Edge Function but OneSignal’s Email sending settings are not yet fully configured.
- Medication and hydration reminders currently share a single daily time; no per-reminder custom scheduling yet.

## Disclaimer

Cycle, ovulation, and fertility predictions are statistical estimates based on logged averages, not a medical diagnosis or a reliable method of contraception on their own. The app’s “fertile window” messaging is intentionally descriptive rather than prescriptive for this reason.
