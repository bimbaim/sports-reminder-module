# Sports Reminder Module

An event-driven automated notification system that allows users to subscribe to sports match reminders via WhatsApp and Email. The system is designed as a multi-tenant platform where pubs (tenants) can embed a style-isolated widget on their websites to capture subscribers. The backend is designed to sync sports fixtures (football, UFC, NBA, F1), match them with subscriber favorites, and process notifications.

---

## 🚀 Key Features

* **Multi-Tenant Dashboard:** Interface for administrators to create, manage, and configure tenant branding (logo, colors, custom CTA text, theme mode).
* **Embeddable Ingestion Widget:** Lightweight client-side form loader script (`widget.js`) that injects a style-isolated iframe containing a subscription form (`/embed/[tenant-slug]` or `/embed/verify?token=[public_token]`).
* **Dynamic Team Ingestion:** Auto-complete search form that dynamically loads teams based on the tenant's selected leagues.
* **Sports Data Synchronization:** Cron-triggered data sync that fetches tournament leagues and fixtures from third-party sports APIs (RapidAPI / API-Sports) and updates the local cache tables.
* **Automated Notification Logs:** Real-time log dashboard to monitor WhatsApp/Email transaction dispatches.

---

## 🛠️ Tech Stack

* **Framework:** Next.js 15+ (App Router)
* **Libraries:** React 19, Radix UI Primitives, Lucide React, Date-fns, Sonner (Toaster)
* **Styling:** Tailwind CSS v3, CSS variables
* **Database & Auth:** Supabase (PostgreSQL with Row Level Security policies, `@supabase/ssr` authentication)
* **Package Manager:** npm

---

## 🔑 Environment Setup

Create a `.env.local` file in the root directory and define the following variables:

```bash
# Supabase Configuration
NEXT_PUBLIC_SPORTS_REMINDER_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SPORTS_REMINDER_SUPABASE_ANON_KEY="your-anon-key"
SPORTS_REMINDER_SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Database Connection Info
SPORTS_REMINDER_POSTGRES_HOST="db.your-project.supabase.co"
SPORTS_REMINDER_POSTGRES_USER="postgres"
SPORTS_REMINDER_POSTGRES_PASSWORD="your-db-password"
SPORTS_REMINDER_POSTGRES_DATABASE="postgres"
SPORTS_REMINDER_POSTGRES_URL="postgres://..."

# Meta WhatsApp Cloud API credentials
SPORTS_REMINDER_META_WHATSAPP_ACCESS_TOKEN="your-meta-access-token"
SPORTS_REMINDER_META_PHONE_NUMBER_ID="your-phone-number-id"
SPORTS_REMINDER_META_BUSINESS_ACCOUNT_ID="your-business-account-id"
SPORTS_REMINDER_META_WEBHOOK_VERIFY_TOKEN="your-webhook-verify-token"
SPORTS_REMINDER_META_APP_SECRET="your-meta-app-secret"

# WhatsApp Notification Template
SPORTS_REMINDER_WHATSAPP_TEMPLATE_NAME="sports_reminder_alert"

# Scheduler / Cron Protection
CRON_SECRET="your-cron-secret-key"
```

---

## 💻 Running Locally

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Run Dev Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to access the landing page/login dashboard.

3. **Verify Database:**
   Apply the SQL migration scripts located in the [schema_sql](file:///d:/WORK/WHELLO/NON-WORDPRESS/sports-reminder-module/schema_sql) folder to set up the schema and seed default data.

---

## 📁 Directory Structure

```text
├── app/
│   ├── api/
│   │   └── cron/
│   │       └── sync-matches/   # Mock match sync endpoint (H+1 schedule simulator)
│   ├── auth/                   # Supabase Auth routes (login, register, reset password)
│   ├── dashboard/              # Admin panel pages (Overview, Tenants, Matches, Widgets, Logs)
│   ├── embed/                  # Widget frame targets
│   │   ├── [tenant-slug]/      # URL slug-based widget frame
│   │   └── verify/             # Token-based secure widget frame
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── dashboard/              # Sidebar & layout controls
│   ├── ui/                     # Shared UI components (shadcn/ui-styled)
│   └── login-form.tsx          # Dashboard login handler
├── lib/
│   ├── supabase/               # Client, Server, Admin, and Middleware (proxy) modules
│   └── utils.ts                # General utilities (Tailwind merges, checks)
├── public/
│   └── widget.js               # Client embeddable loader script
├── schema_sql/                 # PostgreSQL migrations and seeds
```

---

## ⚠️ Troubleshooting & Known Issues

1. **Next.js Middleware Bypass:**
   The middleware logic is implemented in [proxy.ts](file:///d:/WORK/WHELLO/NON-WORDPRESS/sports-reminder-module/proxy.ts) following the latest convention.

2. **Cron Mismatch Database Error:**
   The match synchronizer route at [sync-matches/route.ts](file:///d:/WORK/WHELLO/NON-WORDPRESS/sports-reminder-module/app/api/cron/sync-matches/route.ts) attempts to insert mock fixtures using old column names (`sport_type`, `team_a`, `team_b`, `match_time`). It must be updated to align with the new schema (`league_id`, `competitor_a`, `competitor_b`, `kickoff_time`).

3. **Notification Logs Crash:**
   The logging page at [logs/page.tsx](file:///d:/WORK/WHELLO/NON-WORDPRESS/sports-reminder-module/app/dashboard/logs/page.tsx) selects `home_team` and `away_team` from the `matches` table. Since the table uses `competitor_a` and `competitor_b`, querying these non-existent columns causes a database exception.

4. **Broken Logout Button:**
   The logout form in the sidebar attempts to POST to `/auth/sign-out`, but no route handler or action is registered at that path. Users will experience a 404 error.