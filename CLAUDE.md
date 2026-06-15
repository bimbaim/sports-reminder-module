# CLAUDE.md - Claude Code Developer Instructions

## 📋 Project Overview
The **Sports Reminder Module** is a multi-tenant subscription framework. Pubs (tenants) display a widget on their sites, enabling users to receive match-day alerts via WhatsApp and email.

---

## 🏛️ Current Architecture & Business Logic
* **Framework:** Next.js App Router (15+) + React 19.
* **Flow:** 
  1. Admin manages tenants at `/dashboard/tenants`.
  2. Embed script `/widget.js` loads widget iframe `/embed/[tenant-slug]` or `/embed/verify?token=...`.
  3. Client selects leagues and teams, saving preferences to `subscribers`.
  4. Sports API fixtures ingest data to `matches` and `leagues` via on-demand button or daily cron.
  5. Notification logs track dispatches.

---

## ⚠️ Key Inconsistencies & Known Bugs
1. **Cron Ingest Mismatch:** [sync-matches/route.ts](file:///d:/WORK/WHELLO/NON-WORDPRESS/sports-reminder-module/app/api/cron/sync-matches/route.ts) attempts to insert old columns (`sport_type`, `team_a`, `team_b`, `match_time`). The database uses `league_id`, `competitor_a`, `competitor_b`, and `kickoff_time`.
2. **Logs Page Crash:** [logs/page.tsx](file:///d:/WORK/WHELLO/NON-WORDPRESS/sports-reminder-module/app/dashboard/logs/page.tsx) queries `home_team` and `away_team` from `matches`. Change this to `competitor_a` and `competitor_b`.
3. **Broken Logout:** Form targets `/auth/sign-out` in sidebar but that route does not exist.
4. **Resolved Middleware:** The routing middleware is now named `proxy.ts` following the updated convention.

---

## 🔧 Preferred Coding Patterns
* **Clients:** Fetch data using server-side wrappers (`createAdminClient`) in Server Actions or endpoints.
* **Validation:** Enforce inputs checks using standard regex for emails and phone numbers (e.g. WhatsApp with country code prefix).
* **CORS:** Enable wildcard or strict domain CORS headers for public API endpoints.

---

## 🚫 Forbidden Patterns
* **No Inline secrets:** Do not hardcode database URLs or API keys.
* **No standard supabase client keys on client side:** Avoid using standard `process.env.NEXT_PUBLIC_SUPABASE_URL`. Always use `process.env.NEXT_PUBLIC_SPORTS_REMINDER_SUPABASE_URL`.
* **No Direct DB Mutations on Client:** Always funnel database operations through server actions or API endpoints.

---

## 🔄 AI Agent Instructions
* **Read before write:** Always read the target file and any related database migrations before writing or updating code.
* **Preserve compatibility:** Ensure schema updates maintain backwards compatibility for existing tenants.
* **No destructive schema changes:** Do not alter columns without updating dependent select queries in dashboard components.
* **Verify builds:** Run `npm run build` or `npx tsc --noEmit` locally to check for type errors before completing tasks.
