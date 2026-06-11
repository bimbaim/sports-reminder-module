# AGENTS.md - Developer Guidelines for AI Agents

Welcome, AI Agent! This document acts as your manual and constraints list for working on the **Sports Reminder Module** codebase. Read this carefully to ensure you do not break database schemas, authentication flows, or route conventions.

---

## 🎯 Project Purpose
A multi-tenant system allowing commercial pubs (tenants) to embed widgets on their sites. End-subscribers sign up to receive WhatsApp/Email notifications for sports events (football, F1, UFC, NBA). 

---

## 🛠️ Tech Stack
* Next.js 15+ (App Router)
* React 19
* Tailwind CSS v3
* Supabase Client (Anon/Service Role) & PostgreSQL Database
* npm (package-lock.json)

---

## 🏛️ Architecture Overview
* **Admin Dashboard:** Next.js pages under `/app/dashboard` leveraging Server Components for data fetching and custom client scripts.
* **Embed Widget:** Target pages loaded inside iframes at `/embed/[tenant-slug]` and `/embed/verify`.
* **CORS Loader:** `public/widget.js` script queries script parameters, generates the iframe element, and mounts it into the third-party DOM.
* **Data Layer:** Row Level Security (RLS) enabled on all tables. Queries from public clients are blocked; only server-side execution with the `service_role` key can read/write.

---

## 📂 Important Directories
* [/app](file:///d:/WORK/WHELLO/NON-WORDPRESS/sports-reminder-module/app): Next.js App Router folders.
* [/app/api/cron](file:///d:/WORK/WHELLO/NON-WORDPRESS/sports-reminder-module/app/api/cron): Location of automated cron schedulers.
* [/lib/supabase](file:///d:/WORK/WHELLO/NON-WORDPRESS/sports-reminder-module/lib/supabase): Clients for Supabase (client, server, admin, session manager).
* [/schema_sql](file:///d:/WORK/WHELLO/NON-WORDPRESS/sports-reminder-module/schema_sql): PostgreSQL migrations.

---

## 📐 Coding Standards
* Write TypeScript with explicit types; avoid `any`.
* Keep styling aligned with Tailwind config HSL palettes (`bg-background`, `text-primary`, etc.).
* Handle errors gracefully with try-catch blocks and log descriptive details on the server.

---

## 🏷️ Naming Conventions
* Prefix environment variables with `SPORTS_REMINDER_` (e.g. `SPORTS_REMINDER_SUPABASE_URL`).
* Use kebab-case for URL slugs.
* Use camelCase for TypeScript functions/variables.
* Use PascalCase for React Component filenames (e.g., `WidgetForm.tsx`).

---

## 🔑 Environment Variables
* `NEXT_PUBLIC_SPORTS_REMINDER_SUPABASE_URL`: Target Supabase URL.
* `NEXT_PUBLIC_SPORTS_REMINDER_SUPABASE_ANON_KEY`: Client-side anon key.
* `SPORTS_REMINDER_SUPABASE_SERVICE_ROLE_KEY`: Secret service-role key (never expose to client).

---

## 🗄️ Database Rules
* **Row Level Security (RLS):** Always enabled. Server actions and API routes must use the admin client (`createAdminClient`) to bypass public RLS policies.
* **Schema Updates:** Do not modify tables directly. Create a new `.sql` migration file in `schema_sql/` and document the change.
* **Relationships:** Cascade delete dependencies on parent record removal (e.g., deleting a tenant deletes their subscribers).

---

## 🌐 API Rules
* If creating a REST endpoint, handle CORS preflights (`OPTIONS`) and set origins correctly.
* Ingestion scripts must validate inputs (e.g., email format, WhatsApp phone numbers) before inserting.

---

## 🎨 Frontend Rules
* Widget frames (`/app/embed/...`) must be lightweight and styled cleanly.
* Do not use standard alerts; use `Sonner` or custom HTML inline alert boxes.
* Respect tenant colors (`primary_color`, `secondary_color`) via inline styles or CSS variables.

---

## 🧪 Testing Rules
* Check changes using TypeScript verification (`npx tsc --noEmit`).
* Keep mock data aligned with database structures.

---

## 🚀 Deployment Rules
* Verify build compatibility by running `npm run build` locally before requesting deployment.
* Ensure all environment variables are correctly registered in the deployment console.

---

## ❌ Things Agents Must Never Do
1. **Never use standard Next.js environment variables (`NEXT_PUBLIC_SUPABASE_URL`)** in Supabase setup. You must use the custom `SPORTS_REMINDER_` prefixed versions.
2. **Never commit raw API Keys or Database passwords** to files. Use environment variables.
3. **Never write raw SQL queries** inside client-side components. Use Supabase Client APIs or server actions.
4. **Never delete existing columns** in migrations without checking dependencies in both dashboard pages and action functions.

---

## 🔄 Safe Refactoring Guidelines
1. **Verify schemas:** Cross-reference `matches` and `leagues` columns before updating match-sync scripts.
2. **Check middleware naming:** The file named `proxy.ts` in root is bypassed by Next.js. If you must enable middleware, rename it to `middleware.ts` and test dashboard routing.
3. **Test Server Actions:** Ensure server actions are exported with `"use server"` at the top of the file.
