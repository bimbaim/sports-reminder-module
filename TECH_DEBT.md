# TECH_DEBT.md - Technical Debt & Deficit Log

## 🛠️ Codebase Technical Debt

### 1. Database Schema Mismatch in Ingestion Route
* **ID:** TD-001
* **File:** [sync-matches/route.ts](file:///d:/WORK/WHELLO/NON-WORDPRESS/sports-reminder-module/app/api/cron/sync-matches/route.ts)
* **Description:** Inserts fields `sport_type`, `team_a`, `team_b`, and `match_time` which do not exist in the matches table since the leagues migration.
* **Impact:** Cron match syncing is broken and throws database errors.
* **Priority:** **CRITICAL**
* **Effort:** Low (1 hour)

### 2. Notification Logs Query Mismatch
* **ID:** TD-002
* **File:** [logs/page.tsx](file:///d:/WORK/WHELLO/NON-WORDPRESS/sports-reminder-module/app/dashboard/logs/page.tsx)
* **Description:** Queries non-existent columns `home_team` and `away_team` on `matches`.
* **Impact:** Logs dashboard page is completely broken and crashes.
* **Priority:** **CRITICAL**
* **Effort:** Low (30 mins)

### 3. Misnamed Middleware File
* **ID:** TD-003
* **File:** [proxy.ts](file:///d:/WORK/WHELLO/NON-WORDPRESS/sports-reminder-module/proxy.ts) (root)
* **Description:** Middleware configuration is named `proxy.ts`, which Next.js ignores. It must be named `middleware.ts`.
* **Impact:** Dashboard pages are open to unauthenticated access.
* **Priority:** **CRITICAL**
* **Effort:** Low (5 mins)

### 4. Missing Logout Route Handler
* **ID:** TD-004
* **File:** [app-sidebar.tsx](file:///d:/WORK/WHELLO/NON-WORDPRESS/sports-reminder-module/components/dashboard/app-sidebar.tsx)
* **Description:** Sidebar logout buttons POST to `/auth/sign-out`, but no route handler exists.
* **Impact:** Logout action displays a 404 error page.
* **Priority:** **HIGH**
* **Effort:** Low (1 hour)

### 5. Missing Redis & BullMQ Infrastructure
* **ID:** TD-005
* **File:** N/A (Missing feature)
* **Description:** The queue system specified in requirements (BullMQ + Redis) is completely missing. Reminders are dispatches via `setTimeout` in the sync route.
* **Impact:** High message rates risk API rate limiting.
* **Priority:** **HIGH**
* **Effort:** Medium (3-5 days)
