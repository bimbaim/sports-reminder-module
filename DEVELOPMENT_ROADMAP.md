# DEVELOPMENT_ROADMAP.md - MVP Development Roadmap

This roadmap outlines the prioritized phases and tasks required to take the Sports Reminder Module from its current state to a production-ready MVP.

---

## 🛠️ Phase 1 - Stabilization (Quick Wins)
*Focus: Resolving critical crashes, fixing route configurations, and securing the dashboard.*

### 1. Activating Route Authentication Middleware
* **Why it matters:** Currently, admin dashboard settings can be bypassed because the middleware filename is misnamed (`proxy.ts` instead of `middleware.ts`).
* **Dependencies:** None
* **Estimated Complexity:** Low (5 mins)
* **Business Impact:** Prevents unauthorized configurations of tenant branding.

### 2. Resolving Database Column Mismatches in Sync Route & Logs
* **Why it matters:** The matches sync endpoint and notification log dashboards currently crash due to incorrect SQL column references.
* **Dependencies:** Database Migration schemas
* **Estimated Complexity:** Low (2 hours)
* **Business Impact:** REST API sync queries and logs tables load successfully for testing and demo flows.

### 3. Implementing Sign-Out Session Route
* **Why it matters:** Sidebar logout forms target `/auth/sign-out` which results in a 404 error.
* **Dependencies:** Supabase Server Client
* **Estimated Complexity:** Low (1 hour)
* **Business Impact:** Allows administrators to securely sign out of dashboard panels.

---

## 📢 Phase 2 - Core Notification Engine
*Focus: Building out the actual dispatch channels and managing background dispatches safely.*

### 1. Setting Up Redis & BullMQ Queue Infrastructure
* **Why it matters:** Processing notification dispatches directly inside Serverless API requests causes memory leaks and timeouts. A queuing framework manages dispatches reliably.
* **Dependencies:** Upstash Redis token, `bullmq` dependency
* **Estimated Complexity:** Medium (3-4 days)
* **Business Impact:** High-throughput notifications can scale without serverless crashes.

### 2. Integrating Meta WhatsApp Cloud API Gateway
* **Why it matters:** The system relies on Meta's WhatsApp Cloud API to send pre-approved match reminders to subscribers.
* **Dependencies:** Meta Developer account, approved templates, and phone number token
* **Estimated Complexity:** Medium (2-3 days)
* **Business Impact:** Core delivery mechanism to drive subscriber conversions and table reservations.

### 3. Setting Up Resend Email Gateway
* **Why it matters:** Provides an email reminder channel as a parallel notification fallback.
* **Dependencies:** Resend API credentials, verified domains
* **Estimated Complexity:** Low (1 day)
* **Business Impact:** Dual delivery channels ensure subscribers receive reminders even if phone numbers are incorrect.

---

## 🚀 Phase 3 - Production Launch
*Focus: Configuring cron triggers and finalizing basic validations.*

### 1. Vercel Cron Configuration
* **Why it matters:** Automates daily match sync and reminder checks at 8:00 AM local time.
* **Dependencies:** `vercel.json` scheduler configurations
* **Estimated Complexity:** Low (4 hours)
* **Business Impact:** Removes manual sync operations, running the system autonomously.

### 2. Form Input Schema Validations (Zod)
* **Why it matters:** Ensures WhatsApp numbers are submitted with the correct country code formatting for Meta dispatch.
* **Dependencies:** `zod` schema validator
* **Estimated Complexity:** Low (4 hours)
* **Business Impact:** Decreases delivery failure logs from malformed phone numbers.

---

## 📈 Phase 4 - Scale & Optimization
*Focus: Long-term performance improvements and scaling preparation.*

### 1. Database Pagination and Range Queries
* **Why it matters:** Querying all rows in `notification_logs` at once degrades page load speed.
* **Dependencies:** UI Table adjustments
* **Estimated Complexity:** Low (1 day)
* **Business Impact:** Keeps the dashboard responsive as database records increase.

### 2. Optimized SQL Filters (Bypassing In-Memory Arrays)
* **Why it matters:** In-memory filtering of subscribers in next.js causes performance bottlenecks at scale.
* **Dependencies:** PostgreSQL joins
* **Estimated Complexity:** Medium (2 days)
* **Business Impact:** Reduces database query times and server execution costs.
