# EXECUTION_PRIORITY.md - MVP Launch Execution Priority

This document maps out the prioritized backlog to convert the project from 72% maturity to MVP Launch Ready.

---

## 🛑 Priority 0 (Must Fix Today)
*Focus: Stabilization and security. Fixes broken components to make the application fully usable for internal testing.*

### 1. TS-001: Rename `proxy.ts` → `middleware.ts`
* **Impact:** Security Critical. Next.js router will execute middleware checks and restrict unauthenticated access to dashboard views.
* **File:** [proxy.ts](file:///d:/WORK/WHELLO/NON-WORDPRESS/sports-reminder-module/proxy.ts)

### 2. TS-002: Fix `sync-matches` Schema Mismatch
* **Impact:** Cron System Restored. Synchronizer route successfully inserts mock matches matching the new database columns.
* **File:** [route.ts](file:///d:/WORK/WHELLO/NON-WORDPRESS/sports-reminder-module/app/api/cron/sync-matches/route.ts)

### 3. TS-003: Fix Dashboard Logs Query
* **Impact:** Monitoring Restored. The Notification Logs table loads successfully inside the dashboard overview.
* **File:** [page.tsx](file:///d:/WORK/WHELLO/NON-WORDPRESS/sports-reminder-module/app/dashboard/logs/page.tsx)

### 4. TS-004: Implement Auth Sign-Out Route
* **Impact:** Authentication Complete. Resolves 404 error when clicking logout by registering a sign-out POST target handler.
* **File:** [app-sidebar.tsx](file:///d:/WORK/WHELLO/NON-WORDPRESS/sports-reminder-module/components/dashboard/app-sidebar.tsx)

**Expected Result:** Dashboard becomes secure, fixtures sync, logs render successfully, and auth flows operate cleanly.

---

## 📢 Priority 1 (Required For MVP)
*Focus: Implementing messaging delivery infrastructure.*

### 1. TS-005: Redis Client Connection
* **Impact:** Queue connection layer established.

### 2. TS-006: BullMQ Queue Integration
* **Impact:** Asynchronous workers configured.

### 3. TS-007: WhatsApp Cloud API Gateway Setup
* **Impact:** Connects Meta API templates to dispatcher workers.

**Expected Result:** Real-time WhatsApp notifications are safely delivered to subscribers' devices.

---

## 🚀 Priority 2 (Required For Production)
*Focus: Autonomy and inputs validations.*

### 1. TS-008: Vercel Cron Scheduling
* **Impact:** Automated daily synchronization tasks.

### 2. TS-009: Zod Form Validation
* **Impact:** Prevents malformed subscriber contact payloads.

**Expected Result:** System runs autonomously on schedule without dirty data entries.

---

## 📈 Priority 3 (Post-MVP)
*Focus: Scaling, billing, and optimization.*

* **Pagination:** Database query range constraints on log feeds.
* **Query Optimization:** Joins filtering instead of in-memory array manipulation.
* **Performance Tuning:** Next.js bundle optimizations.
* **Analytics:** Charts and insights on tenant conversions.
* **Multi-Admin Support:** Multi-user permission configurations.
* **Tenant Billing:** Stripe integrations to bill pub owners.
