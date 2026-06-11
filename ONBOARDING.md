# ONBOARDING.md - Senior Developer Guide

Welcome to the **Sports Reminder Module** project! This guide is designed to get you fully oriented and comfortable with the codebase, database schemas, business flows, and technical issues within 30 minutes.

---

## 🎯 1. Business Context & Problem Solved
Commercial sports bars and pubs ("tenants") struggle to consistently fill tables during sports fixtures. They rely on social media or physical posters.
This platform solves this by offering an **embeddable signup widget** that pubs place on their websites. Fans ("subscribers") register their email and WhatsApp numbers and choose their favorite leagues/teams. The system automatically queries fixtures from third-party sports APIs, checks when their favorite teams play, and sends a WhatsApp/Email reminder beforehand, urging them to visit the pub (including a custom CTA link to book a table at that specific pub).

---

## 📈 2. Value Creation
* **Pub Retention:** Drives foot traffic to sports bars on match days.
* **SaaS Subscription:** Pubs pay a subscription fee to generate widgets and access logs.
* **Lead Generation:** Aggregates a targeted, sports-fan marketing database.

---

## 🗺️ 3. Main User Journeys

```
[ SaaS Admin Onboards Tenant ] ──► [ Pub Embeds widget.js ] ──► [ Visitor Subscribes ] ──► [ Daily Cron Syncs Fixtures ] ──► [ WhatsApp Alert Dispatched ]
```

---

## 🏛️ 4. Current Architecture
A standard **Next.js 15+ App Router** project backed by **Supabase (PostgreSQL)**.

```
                  ┌───────────────────────────────┐
                  │          Next.js App          │
                  └───────────────┬───────────────┘
                                  │ (Server Actions)
       ┌──────────────────────────┼──────────────────────────┐
       ▼                          ▼                          ▼
┌──────────────┐           ┌──────────────┐           ┌──────────────┐
│ Admin Panel  │           │ Embed Widget │           │ Cron API     │
│ (/dashboard) │           │  (/embed)    │           │ (/api/cron)  │
└──────┬───────┘           └──────┬───────┘           └──────┬───────┘
       │                          │                          │
       └──────────────────────────┼──────────────────────────┘
                                  ▼
                     ┌─────────────────────────┐
                     │ Supabase client (Admin) │
                     └────────────┬────────────┘
                                  ▼
                     ┌─────────────────────────┐
                     │  Supabase PostgreSQL    │
                     └─────────────────────────┘
```

---

## 🗄️ 5. Database Overview
Row Level Security (RLS) is enabled on all tables. Queries from client-side scripts are blocked by default; only the backend `service_role` client has full bypass policies.

```
+────────────────+         +────────────────+         +─────────────────────+
│    tenants     │◄────────│  subscribers   │────────►│  notification_logs  │
+────────────────+         +────────────────+         +─────────────────────+
│ id (UUID, PK)  │         │ id (UUID, PK)  │         │ id (UUID, PK)       │
│ slug (Unique)  │         │ tenant_id (FK) │         │ subscriber_id (FK)  │
│ public_token   │         │ email, phone   │         │ match_id (FK)       │
+────────────────+         +────────────────+         │ channel, status     │
                                                      +──────────┬──────────+
+────────────────+         +────────────────+                    │
│    leagues     │◄────────│    matches     │◄───────────────────┘
+────────────────+         +────────────────+
│ id (INT, PK)   │         │ id (Str, PK)   │
│ sport_category │         │ league_id (FK) │
+────────────────+         │ competitor_a/b │
                           +────────────────+
```

---

## 🌐 6. API Overview
* **`/api/cron/sync-matches` [GET]:** Triggers sports sync and mocks notifications.
* **`/auth/confirm` [GET]:** Handles email OTP logins.
* **Server Action `subscribeToTenant`:** Stores subscriber records.
* **Server Action `getTeamsForLeagues`:** Fetches competitor list for search inputs.

---

## 🔄 7. Match Synchronization Flow
```
[ Cron / Sync Action ] 
  ──► Query sport_settings credentials
  ──► Fetch Leagues from API-Sports 
  ──► Upsert to leagues table 
  ──► Fetch Fixtures for next 7 days
  ──► Filter and Upsert to matches table
```

---

## 📢 8. Notification Flow
*Currently simulated in memory within the cron route:*
```
[ Cron Route ] 
  ──► Fetch matches for next 24h
  ──► Fetch all subscribers
  ──► Filter subscribers (likes team or sport) in-memory
  ──► Insert notification_logs (status: 'pending')
  ──► Wait 1.5s (Mock dispatch)
  ──► Update status: 'success'
```

---

## 🔑 9. Authentication Flow
Managed entirely via **Supabase Auth Client** using email and passwords. The cookies session context is verified via root middleware.

---

## 🏢 10. Tenant Architecture
Each tenant has a secure UUID and a `public_token` (e.g. `pub_live_xxxxxx`).
The widget is loaded on third-party sites using:
```html
<script src="https://domain/widget.js" data-token="pub_live_xxxxxx"></script>
```
Which maps to the secure token-based view `/embed/verify?token=pub_live_xxxxxx` inside an iframe.

---

## 🐛 11. Current Known Bugs
1. **Cron Match Ingestion crash:** `sync-matches/route.ts` attempts to upsert columns `sport_type`, `team_a`, `team_b`, and `match_time`. These do not exist in the matches table since the updated leagues migration.
2. **Dashboard Logs crash:** `dashboard/logs/page.tsx` selects `home_team` and `away_team` columns from `matches`.
3. **Broken Logout:** Sidebar form targets `/auth/sign-out`, which is a 404.

---

## 💸 12. Technical Debt
* **Ignored Middleware:** Root middleware file is named `proxy.ts` instead of `middleware.ts`. Next.js ignores it, making dashboard pages accessible to anyone.
* **In-Memory Filtering:** Subscribers are filtered in arrays in Next.js backend, causing scaling issues.
* **No Real Queue System:** BullMQ and Redis are missing.

---

## 🚫 13. Production Blockers
* Correct the middleware naming to secure the admin pages.
* Align table column names in routes/queries with SQL schemas.

---

## 🟢 14. Safe Zones to Modify
* Presentation files in [components/ui/](file:///d:/WORK/WHELLO/NON-WORDPRESS/sports-reminder-module/components/ui).
* Layout structures and styling classes.

---

## 🔴 15. Dangerous Zones to Modify
* Supabase client initialization in [lib/supabase/](file:///d:/WORK/WHELLO/NON-WORDPRESS/sports-reminder-module/lib/supabase) (causes session crashes).
* Modifying historical SQL migration scripts directly.

---

## 🚀 16. Development Priority List
1. Rename `proxy.ts` to `middleware.ts`.
2. Fix columns in `sync-matches/route.ts` and `logs/page.tsx`.
3. Implement `/auth/sign-out` endpoint.
4. Implement Upstash Redis & BullMQ queuing.
