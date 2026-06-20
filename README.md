# CycleCare

CycleCare is a menstrual cycle, ovulation, and fertility tracking web app built with vanilla HTML/CSS/JS on the frontend and Supabase as the backend. It calculates cycle predictions live from logged history, layers in optional daily fertility signals (temperature and cervical mucus), and sends reminders via push and email.

## Features

- **Cycle calculation engine** — live-calculated cycle day, days until next period, ovulation date, and fertile window, derived from real period history. Personalizes the assumed luteal phase length per user once enough confirmed-ovulation history exists, instead of always assuming a fixed 14 days for everyone.
- **Period logging** — start/close flow supporting an in-progress period, with automatic recalculation of averages and consistency.
- **Symptom logging** — quick tap-to-select symptom picker.
- **Daily Fertility Check-in** — optional daily logging of cervical mucus (no tools needed) and basal body temperature (requires a real basal thermometer; a regular fever thermometer isn’t precise enough). Includes:
  - **Temperature shift detection** — confirms ovulation retroactively once a sustained rise is detected across 9+ days of logged temperatures.
  - **Mucus signal** — a real-time, same-day fertility-level reading based on the most recent observation.
  - Both signals are shown alongside the calendar estimate, not silently merged into one number — when a confirmed temperature date exists, it’s shown next to the calendar estimate so the two are never confused as the same thing.
- **First-time tour** — a multi-slide walkthrough shown once to new users, explaining how to log periods, symptoms, and daily check-ins, before handing off into the cycle setup modal.
- **Reminders** — toggle-based settings (period, ovulation, medication, hydration) backed by `cycle_settings`, reflected live on the dashboard.
- **Calendar view** — markers for logged periods, fertile window, ovulation day, and predicted next period.
- **Empty states** — new users see clear “no data yet” prompts instead of placeholder data, with one-time nudge notifications guiding setup.
- **Automated reminders** — a Supabase Edge Function (`daily-cycle-notifications`, scheduled via `pg_cron` every 15 minutes) checks each user’s data in their own timezone and sends, across multiple channels, for:
  - Period reminders (2 days out, due today, or late)
  - Ovulation day and fertile window start
  - Medication and hydration reminders at the user’s chosen time
- **Multi-channel delivery** — every reminder is sent through three channels together: an in-app notification (always works), a push notification via OneSignal (Android/desktop confirmed working; iOS has a known platform limitation, see *Known Issues*), and a branded email via Resend (works on every platform, including iOS, as the reliable fallback).
- **Transactional emails** — a separate on-demand Edge Function (`send-transactional-email`) sends one-off branded emails for: welcome on signup, cycle setup completed, password changed, and the same onboarding nudges as the in-app notifications (no cycle data yet, no symptoms yet, no period history yet, no reminders enabled yet).
- **PWA support** — installable to a phone’s home screen via `manifest.json` and a service worker, without the iOS “edge-to-edge” mode that can hide content behind the notch/status bar.

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript (no framework)
- **Backend:** [Supabase](https://supabase.com) — Postgres, Auth, Edge Functions, `pg_cron`
- **Push:** [OneSignal](https://onesignal.com)
- **Email:** [Resend](https://resend.com), domain DNS managed via Hostinger
- **Hosting:** Vercel

## Database Tables

|Table                |Purpose                                                                                |
|---------------------|---------------------------------------------------------------------------------------|
|`cycle_profile`      |User profile, goal, timezone, onboarding/tour status                                   |
|`cycle_period_logs`  |Logged period start/end dates, lengths, confirmed ovulation date per cycle             |
|`cycle_cycle_stats`  |Current cycle predictions (ovulation, confirmed ovulation, fertile window, next period)|
|`cycle_symptoms`     |Logged daily symptoms                                                                  |
|`cycle_daily_logs`   |Daily BBT temperature and cervical mucus observations                                  |
|`cycle_notifications`|In-app notification feed                                                               |
|`cycle_settings`     |Reminder toggles and reminder time                                                     |

## Edge Functions

### `daily-cycle-notifications`

Runs every 15 minutes via `pg_cron` + `pg_net`. For each user: computes “today” and local hour in their own timezone, checks period/ovulation/fertile-window triggers during their local morning window, checks medication/hydration/check-in triggers against their chosen `reminder_time`, deduplicates via `cycle_notifications`, then sends push (OneSignal) and email (Resend) together.

### `send-transactional-email`

On-demand, called directly from frontend code via `supabaseClient.functions.invoke(...)` for one-off events: signup welcome, cycle setup completed, password changed, and the onboarding nudges.

## Setup

1. Create a Supabase project and the tables listed above.
1. **Enable Row Level Security on every `cycle_*` table** and add policies so users can only read/write their own rows. *(See Known Issues — this still needs full confirmation across every table.)*
1. Enable `pg_cron` and `pg_net` extensions in Supabase.
1. Set Edge Function secrets:
   
   ```bash
   supabase secrets set ONESIGNAL_APP_ID=your_app_id
   supabase secrets set ONESIGNAL_API_KEY=your_rest_api_key
   supabase secrets set RESEND_API_KEY=your_resend_key
   ```
1. Deploy both functions:
   
   ```bash
   supabase functions deploy daily-cycle-notifications
   supabase functions deploy send-transactional-email
   ```
1. Schedule the cron job — double-check the Authorization header uses your **real** service role key, not a placeholder:
   
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
1. Set up OneSignal (Web Push app, SDK + `OneSignalSDKWorker.js` at site root) and `manifest.json` + icons for PWA install support.
1. Verify your sending domain in Resend: add the SPF and DKIM records they provide, **plus a DMARC TXT record** (`_dmarc.yourdomain.com`, starting with `v=DMARC1; p=none; rua=mailto:you@yourdomain.com`) — SPF/DKIM alone is no longer enough for reliable inbox placement with Gmail/Yahoo.

## Known Issues / Roadmap

- **Row Level Security** has only been confirmed on `cycle_daily_logs` so far (caught by accident via an insert error). Every other table needs the same check before real user data is trusted with this app.
- **iOS Safari web push** is unreliable due to a WebKit-level bug where notification permission is granted but no push token is ever created. This is a platform limitation, not specific to this app. Email and in-app notifications work correctly on all platforms regardless, and exist specifically to cover this gap.
- **Email deliverability** may land in spam initially even with SPF/DKIM/DMARC correctly configured, since a brand-new sending domain has no reputation yet — this improves with consistent sending over time.
- **Medication, hydration, and daily check-in reminders** currently share a single daily time; no per-reminder custom scheduling yet. `fertile_window_reminders` and `daily_checkin_reminders` exist as database columns the Edge Function checks, but have no toggle in the Settings UI yet — they currently rely on their default values.
- **Personalized luteal phase** only takes effect from a user’s second confirmed cycle onward — temperature logging in the current cycle won’t change that cycle’s prediction, only future ones.

## Disclaimer

Cycle, ovulation, and fertility predictions are statistical estimates based on logged averages and optional daily signals, not a medical diagnosis or a reliable method of contraception on their own. The app’s fertile window messaging is intentionally descriptive rather than prescriptive for this reason.
