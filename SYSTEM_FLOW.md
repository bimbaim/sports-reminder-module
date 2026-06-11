# SYSTEM_FLOW.md - System Flow & Execution Audit

This document traces the actual end-to-end execution flows and maps critical process breakpoints based on code evidence.

---

## 🔄 End-to-End System Flows

### 1. Embedded Widget Loading
* **Trigger:** Visitor opens a third-party website containing the widget script tag.
* **File involved:** [widget.js](file:///d:/WORK/WHELLO/NON-WORDPRESS/sports-reminder-module/public/widget.js)
* **Function involved:** `initWidgets()`
* **Database tables touched:** None
* **External APIs involved:** `/embed/verify?token=...` or `/embed/[tenant-slug]`
* **Current status:** **Working**

### 2. Widget Authentication & Setup
* **Trigger:** Iframe requests the target route.
* **File involved:** [page.tsx](file:///d:/WORK/WHELLO/NON-WORDPRESS/sports-reminder-module/app/embed/[tenant-slug]/page.tsx) or [page.tsx](file:///d:/WORK/WHELLO/NON-WORDPRESS/sports-reminder-module/app/embed/verify/page.tsx)
* **Function involved:** `EmbedWidgetPage` / `VerifyContent`
* **Database tables touched:** `tenants`, `leagues`
* **External APIs involved:** None
* **Current status:** **Working**

### 3. Dynamic Competitor Search
* **Trigger:** Subscriber selects a league in the form.
* **File involved:** [actions.ts](file:///d:/WORK/WHELLO/NON-WORDPRESS/sports-reminder-module/app/embed/[tenant-slug]/actions.ts)
* **Function involved:** `getTeamsForLeagues()`
* **Database tables touched:** `matches`
* **External APIs involved:** None
* **Current status:** **Working**

### 4. Subscription Registration Intake
* **Trigger:** Subscriber clicks the CTA submit button.
* **File involved:** [widget-form.tsx](file:///d:/WORK/WHELLO/NON-WORDPRESS/sports-reminder-module/app/embed/[tenant-slug]/widget-form.tsx) and [actions.ts](file:///d:/WORK/WHELLO/NON-WORDPRESS/sports-reminder-module/app/embed/[tenant-slug]/actions.ts)
* **Function involved:** `subscribeToTenant()`
* **Database tables touched:** `subscribers`
* **External APIs involved:** None
* **Current status:** **Working**

### 5. Daily Match Synchronization
* **Trigger:** Cron runner triggers matching sync GET request.
* **File involved:** [route.ts](file:///d:/WORK/WHELLO/NON-WORDPRESS/sports-reminder-module/app/api/cron/sync-matches/route.ts)
* **Function involved:** `GET()`
* **Database tables touched:** `matches` (upsert fails)
* **External APIs involved:** None
* **Current status:** **Broken** (Fails to execute due to columns mismatch)

### 6. Notification Dispatch Checks
* **Trigger:** Match sync router maps matches scheduled for H+1.
* **File involved:** [route.ts](file:///d:/WORK/WHELLO/NON-WORDPRESS/sports-reminder-module/app/api/cron/sync-matches/route.ts)
* **Function involved:** `GET()`
* **Database tables touched:** `subscribers` (read only)
* **External APIs involved:** None
* **Current status:** **Broken** (Dependent match creation above crashes)

### 7. Notification Logs Creation
* **Trigger:** Loop over target filtered subscriber arrays.
* **File involved:** [route.ts](file:///d:/WORK/WHELLO/NON-WORDPRESS/sports-reminder-module/app/api/cron/sync-matches/route.ts)
* **Function involved:** `GET()`
* **Database tables touched:** `notification_logs`
* **External APIs involved:** None
* **Current status:** **Broken** (Blocks on sync step)

### 8. Message Dispatch Gateways
* **Trigger:** Loop over queued notification items.
* **File involved:** N/A (Missing feature)
* **Function involved:** N/A
* **Database tables touched:** None
* **External APIs involved:** Meta WhatsApp API, Resend API
* **Current status:** **Missing** (Only simulated via 1.5s delay timer)

---

## 📊 Flow Diagrams

### A. Subscriber Registration Flow
```mermaid
sequenceDiagram
  autonumber
  actor Visitor
  participant Widget as widget.js
  participant Embed as WidgetForm (Iframe)
  participant Actions as actions.ts (Server Action)
  participant DB as Supabase DB

  Visitor->>Widget: Load host webpage
  Widget->>Embed: Mounts iframe with token/slug
  Embed->>DB: Fetch tenants & leagues
  DB-->>Embed: Tenant settings & Leagues list
  Visitor->>Embed: Select league
  Embed->>Actions: getTeamsForLeagues(leagueIds)
  Actions->>DB: Fetch matches by league
  DB-->>Actions: Competitor names
  Actions-->>Embed: Return team list array
  Visitor->>Embed: Input Email, WhatsApp, Teams, Submit
  Embed->>Actions: subscribeToTenant(tenantId, FormData)
  Actions->>DB: Insert subscribers
  DB-->>Actions: Success / Duplicate Violation
  Actions-->>Embed: Render success/error alert in form
```

### B. Match Synchronization Flow
```mermaid
graph TD
  A[Cron / Admin Trigger] --> B{Sync Type?}
  B -->|On-demand Sync Actions| C[matches/actions.ts: ingestSportData]
  B -->|Daily Scheduler GET route| D[sync-matches/route.ts]
  
  C --> E[Fetch active sport settings config]
  E --> F[Fetch leagues list from API-Sports]
  F --> G[Upsert to leagues table]
  G --> H[Fetch fixtures for active leagues]
  H --> I[Upsert matches to matches table]
  
  D --> J[Upsert mock matches - CRASHES ON COLUMNS]
```

### C. Notification Dispatch Flow
```mermaid
graph TD
  A[GET sync-matches] --> B[Fetch active subscribers]
  B --> C[Filter matches scheduled today]
  C --> D[Match subscribers favoring team/sport]
  D --> E[Write notification_logs status = pending]
  E --> F{Gateways implemented?}
  F -->|No| G[Mock delay setTimeout 1.5s]
  G --> H[Update notification_logs status = success]
```

### D. Dashboard Management Flow
```mermaid
graph TD
  A[Admin Login] --> B[Root page '/']
  B --> C[dashboard/layout.tsx AppSidebar]
  C --> D[logs/page.tsx - CRASHES ON QUERY]
  C --> E[tenants/page.tsx - Works]
  C --> F[matches/page.tsx - Works]
  C --> G[widgets/page.tsx - Works]
```

---

## 🚫 CRITICAL FLOW BREAKPOINTS

1. **Dashboard Security Breakpoint:** The dashboard authentication redirect checks do not run because Next.js ignores `proxy.ts`. Admin panels are publicly exposed.
2. **Matches Synchronization Breakpoint:** Triggering the cron API `/api/cron/sync-matches` halts immediately at the mock match insertion statement.
3. **Notification logs Dashboard Breakpoint:** Opening `/dashboard/logs` crashes the rendering tree due to bad query syntax.
4. **Logout Execution Breakpoint:** Clicking log out in the sidebar returns a 404 error page.
5. **Gateway Dispatch Breakpoint:** Notifications never leave the database; there are no active Meta or Resend handlers configured to receive the queue messages.
