# IMPLEMENTATION_PLAN.md - Detailed Development Plan

This document maps out Sprint-by-Sprint tasks, critical path analyses, and minimum requirements for launching the Sports Reminder Module MVP.

---

## 🏃 Sprint 1 - Stabilization (Quick Wins)

### Task ID: TS-001
* **Title:** Activate Routing Protection Middleware
* **Description:** Rename the root `proxy.ts` file to `middleware.ts` so Next.js intercepts routes to check user sessions.
* **Files involved:** [proxy.ts](file:///d:/WORK/WHELLO/NON-WORDPRESS/sports-reminder-module/proxy.ts)
* **Dependencies:** None
* **Risk level:** Low
* **Estimated effort:** 10 mins
* **Acceptance criteria:** Accessing `/dashboard` without an active Supabase session automatically redirects the browser back to `/` (login).
* **Rollback strategy:** Rename `middleware.ts` back to `proxy.ts`.

### Task ID: TS-002
* **Title:** Correct Matches Columns in Sync Route
* **Description:** Align parameters in `sync-matches/route.ts` to insert `league_id`, `competitor_a`, `competitor_b`, and `kickoff_time` instead of deleted columns.
* **Files involved:** [route.ts](file:///d:/WORK/WHELLO/NON-WORDPRESS/sports-reminder-module/app/api/cron/sync-matches/route.ts)
* **Dependencies:** None
* **Risk level:** Low
* **Estimated effort:** 1.5 hours
* **Acceptance criteria:** Invoking `GET /api/cron/sync-matches` successfully inserts mock matches without database schema exceptions.
* **Rollback strategy:** Revert git changes on `app/api/cron/sync-matches/route.ts`.

### Task ID: TS-003
* **Title:** Fix Dashboard Logs Database Query
* **Description:** Replace references of `home_team`/`away_team` with `competitor_a`/`competitor_b` inside logs dashboard data fetch.
* **Files involved:** [page.tsx](file:///d:/WORK/WHELLO/NON-WORDPRESS/sports-reminder-module/app/dashboard/logs/page.tsx)
* **Dependencies:** None
* **Risk level:** Low
* **Estimated effort:** 30 mins
* **Acceptance criteria:** Opening `/dashboard/logs` loads the feed list cleanly without query crash screens.
* **Rollback strategy:** Revert query changes on `app/dashboard/logs/page.tsx`.

### Task ID: TS-004
* **Title:** Build Auth Sign-Out Handler
* **Description:** Add a route handler at `/app/auth/sign-out/route.ts` to invalidate Supabase sessions and clear client-side cookies.
* **Files involved:** New file `/app/auth/sign-out/route.ts`, [app-sidebar.tsx](file:///d:/WORK/WHELLO/NON-WORDPRESS/sports-reminder-module/components/dashboard/app-sidebar.tsx)
* **Dependencies:** Supabase Server Client
* **Risk level:** Low
* **Estimated effort:** 1 hour
* **Acceptance criteria:** Clicking the sidebar sign-out button POSTs to `/auth/sign-out`, signs out the user, and redirects to the landing page.
* **Rollback strategy:** Delete `/app/auth/sign-out/route.ts` and revert form action in `app-sidebar.tsx`.

---

## 🏃 Sprint 2 - Notification Engine

### Task ID: TS-005
* **Title:** Establish Redis Connection Client
* **Description:** Build a Redis initialization module in the queue directory to manage queue data.
* **Files involved:** New files under `/lib/queue/redis.ts` and `/lib/queue/config.ts`
* **Dependencies:** None
* **Risk level:** Medium
* **Estimated effort:** 1 day
* **Acceptance criteria:** Redis client connects successfully using environment configuration strings.
* **Rollback strategy:** Remove `/lib/queue/` additions.

### Task ID: TS-006
* **Title:** Integrate BullMQ Producer and Worker Daemons
* **Description:** Define reminder dispatch job queues and add task handler routines.
* **Files involved:** New files `/lib/queue/queue.ts`, `/lib/queue/worker.ts`
* **Dependencies:** TS-005
* **Risk level:** Medium
* **Estimated effort:** 3 days
* **Acceptance criteria:** Adding a job to the queue triggers the asynchronous background handler without blocking main HTTP requests.
* **Rollback strategy:** Remove BullMQ file configurations.

### Task ID: TS-007
* **Title:** Connect Meta WhatsApp Cloud API Service
* **Description:** Connect the worker to dispatch WhatsApp messages using Meta Developer templates.
* **Files involved:** `/lib/queue/worker.ts`
* **Dependencies:** TS-006
* **Risk level:** High
* **Estimated effort:** 3 days
* **Acceptance criteria:** Subscriber records matching the daily trigger receive actual pre-approved template alerts.
* **Rollback strategy:** Disable the WhatsApp integration toggle in `sport_settings`.

---

## 🏃 Sprint 3 - Production Readiness

### Task ID: TS-008
* **Title:** Create vercel.json Daily Scheduler
* **Description:** Define Vercel Cron rules pointing to `/api/cron/sync-matches` to run every day at 8:00 AM.
* **Files involved:** New file `/vercel.json`
* **Dependencies:** None
* **Risk level:** Low
* **Estimated effort:** 2 hours
* **Acceptance criteria:** Sync route is triggered on the daily schedule on Vercel deployment.
* **Rollback strategy:** Delete `/vercel.json`.

### Task ID: TS-009
* **Title:** Implement Zod Input Validation
* **Description:** Add payload validations to the signup forms.
* **Files involved:** [actions.ts](file:///d:/WORK/WHELLO/NON-WORDPRESS/sports-reminder-module/app/embed/[tenant-slug]/actions.ts)
* **Dependencies:** None
* **Risk level:** Low
* **Estimated effort:** 4 hours
* **Acceptance criteria:** Form errors are rendered if invalid email formats or malformed phone numbers are submitted.
* **Rollback strategy:** Revert actions.ts changes.

---

## 🏃 Sprint 4 - Scale

### Task ID: TS-010
* **Title:** Log Database Pagination
* **Description:** Implement database pagination ranges on the logs query to fetch 25 items at a time.
* **Files involved:** [page.tsx](file:///d:/WORK/WHELLO/NON-WORDPRESS/sports-reminder-module/app/dashboard/logs/page.tsx)
* **Dependencies:** None
* **Risk level:** Low
* **Estimated effort:** 1 day
* **Acceptance criteria:** Log entries load progressively and support pagination triggers in the dashboard.
* **Rollback strategy:** Revert logs page file edits.

---

## 🗺️ Critical Path Analysis

To successfully deploy the MVP, the developer must follow this strict dependency order:
```
[TS-001: middleware.ts] ──► [TS-002: Fix Sync Columns] 
                           └──► [TS-003: Fix Logs Query] ──► [TS-004: Sign-out Route]
                                                               └──► [TS-007: Meta WhatsApp Integration]
                                                                      └──► [TS-008: vercel.json cron]
```

---

## 🏆 Minimum Requirements for MVP Launch
1. Next.js middleware active (`middleware.ts` in root).
2. Clean database matches sync operations (no column name mismatches).
3. Secure login credentials authorization and session cookie clearances.
4. Functional Meta WhatsApp template dispatches.
5. Vercel scheduler configured via `vercel.json`.
