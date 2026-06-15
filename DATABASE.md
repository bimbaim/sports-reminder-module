# DATABASE.md - PostgreSQL Database Schema & Architecture Audit

## 📊 Overview
This project uses Supabase with PostgreSQL. Row Level Security (RLS) is enabled on all tables, and full access is restricted to the internal server engines using the `service_role` key.

---

## 🗂️ Tables Schema

### 1. `tenants`
* **Purpose:** Multi-tenant configuration representing individual commercial pub spaces.
* **Columns:**
  * `id` (UUID, PK): Default `gen_random_uuid()`
  * `name` (VARCHAR(255), NOT NULL)
  * `slug` (VARCHAR(255), UNIQUE, NOT NULL)
  * `contact_email` (VARCHAR(255), NULL)
  * `phone_number` (VARCHAR(50), NULL)
  * `address` (TEXT, NOT NULL)
  * `city` (VARCHAR(100), NOT NULL)
  * `state` (VARCHAR(100), NULL)
  * `postal_code` (VARCHAR(20), NULL)
  * `maps_url` (TEXT, NULL)
  * `logo_url` (TEXT, NULL)
  * `primary_color` (VARCHAR(7), default `'#000000'`, NOT NULL)
  * `secondary_color` (VARCHAR(7), default `'#FFFFFF'`, NOT NULL)
  * `theme_mode` (VARCHAR(20), default `'dark'`, NOT NULL)
  * `custom_cta_text` (VARCHAR(100), default `'Remind Me'`, NOT NULL)
  * `is_active` (BOOLEAN, default `true`, NOT NULL)
  * `created_at` (TIMESTAMPTZ, default `NOW()`, NOT NULL)
  * `public_token` (VARCHAR(100), UNIQUE, NOT NULL)
* **Constraints:**
  * PK: `id`
  * UNIQUE: `slug`, `public_token`
* **Indexes:**
  * `idx_tenants_slug` ON `tenants(slug)`

### 2. `subscribers`
* **Purpose:** Subscriber preferences captured via client forms.
* **Columns:**
  * `id` (UUID, PK): Default `gen_random_uuid()`
  * `tenant_id` (UUID, FK referencing `tenants(id) ON DELETE CASCADE`, NOT NULL)
  * `email` (VARCHAR(255), NOT NULL)
  * `whatsapp_number` (VARCHAR(50), NOT NULL)
  * `favorite_sports` (VARCHAR(50)[], default `'{football}'`, NOT NULL)
  * `favorite_teams` (TEXT[], NULL)
  * `created_at` (TIMESTAMPTZ, default `NOW()`, NOT NULL)
* **Constraints:**
  * PK: `id`
  * FK: `tenant_id` -> `tenants(id)`
  * UNIQUE: `unique_tenant_subscriber` (`tenant_id`, `whatsapp_number`)

### 3. `leagues`
* **Purpose:** Cached sport leagues and competitions.
* **Columns:**
  * `id` (INT, PK): Third-party API ID.
  * `sport_category` (VARCHAR(50), NOT NULL)
  * `name` (VARCHAR(150), NOT NULL)
  * `localized_name` (VARCHAR(150), NULL)
  * `country_code` (VARCHAR(10), NULL)
  * `logo_url` (TEXT, NULL)
  * `is_popular` (BOOLEAN, default `true`, NOT NULL)
  * `created_at` (TIMESTAMPTZ, default `NOW()`, NOT NULL)
* **Constraints:**
  * PK: `id`
* **Indexes:**
  * `idx_leagues_sport` ON `leagues(sport_category)`

### 4. `matches`
* **Purpose:** Sports events synced and cached from third-party APIs.
* **Columns:**
  * `id` (VARCHAR(100), PK)
  * `league_id` (INT, FK referencing `leagues(id) ON DELETE CASCADE`, NOT NULL)
  * `competitor_a` (VARCHAR(150), NULL)
  * `competitor_b` (VARCHAR(150), NULL)
  * `event_title` (VARCHAR(255), NULL)
  * `kickoff_time` (TIMESTAMPTZ, NOT NULL)
  * `status` (VARCHAR(50), default `'scheduled'`, NOT NULL)
  * `created_at` (TIMESTAMPTZ, default `NOW()`, NOT NULL)
* **Constraints:**
  * PK: `id`
  * FK: `league_id` -> `leagues(id)`
* **Indexes:**
  * `idx_matches_kickoff` ON `matches(kickoff_time)`
  * `idx_matches_league` ON `matches(league_id)`

### 5. `notification_logs`
* **Purpose:** Real-time log tracking for BullMQ dispatches.
* **Columns:**
  * `id` (UUID, PK): Default `gen_random_uuid()`
  * `subscriber_id` (UUID, FK referencing `subscribers(id) ON DELETE CASCADE`, NOT NULL)
  * `match_id` (VARCHAR(100), FK referencing `matches(id) ON DELETE CASCADE`, NOT NULL)
  * `channel` (VARCHAR(50), NOT NULL)
  * `status` (VARCHAR(50), default `'pending'`, NOT NULL)
  * `error_message` (TEXT, NULL)
  * `sent_at` (TIMESTAMPTZ, NULL)
  * `created_at` (TIMESTAMPTZ, default `NOW()`, NOT NULL)
* **Constraints:**
  * PK: `id`
  * FK: `subscriber_id` -> `subscribers(id)`
  * FK: `match_id` -> `matches(id)`

### 6. `sport_settings`
* **Purpose:** Upstream third-party API configurations.
* **Columns:**
  * `id` (UUID, PK): Default `gen_random_uuid()`
  * `sport_key` (VARCHAR(50), UNIQUE, NOT NULL)
  * `sport_name` (VARCHAR(100), NOT NULL)
  * `api_url` (TEXT, NOT NULL DEFAULT `''`)
  * `api_key` (TEXT, NOT NULL DEFAULT `''`)
  * `is_active` (BOOLEAN, default `false`, NOT NULL)
  * `last_synced_at` (TIMESTAMPTZ, NULL)
  * `created_at` (TIMESTAMPTZ, default `NOW()`, NOT NULL)
* **Constraints:**
  * PK: `id`
  * UNIQUE: `sport_key`

---

## 🔗 Relationships
* `tenants` (1) ── (many) `subscribers` (ON DELETE CASCADE)
* `leagues` (1) ── (many) `matches` (ON DELETE CASCADE)
* `subscribers` (1) ── (many) `notification_logs` (ON DELETE CASCADE)
* `matches` (1) ── (many) `notification_logs` (ON DELETE CASCADE)

---

## ⚡ Schema Drift & Risks

### [CRITICAL] Mismatch in Ingestion Sync
* **Evidence:** [sync-matches/route.ts](file:///d:/WORK/WHELLO/NON-WORDPRESS/sports-reminder-module/app/api/cron/sync-matches/route.ts#L18-L25)
* **Description:** Inserts `sport_type`, `team_a`, `team_b`, and `match_time`. These columns were deleted in [update_and_insert_leagues.sql](file:///d:/WORK/WHELLO/NON-WORDPRESS/sports-reminder-module/schema_sql/update_and_insert_leagues.sql).
* **Impact:** Route fails with a SQL exception.

### [CRITICAL] Mismatch in Log Dashboard Query
* **Evidence:** [logs/page.tsx](file:///d:/WORK/WHELLO/NON-WORDPRESS/sports-reminder-module/app/dashboard/logs/page.tsx#L18-L21)
* **Description:** Queries `home_team` and `away_team` from `matches` table. These columns do not exist.
* **Impact:** Notification logs dashboard fails to load.
