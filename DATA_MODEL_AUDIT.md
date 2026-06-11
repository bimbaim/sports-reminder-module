# DATA_MODEL_AUDIT.md - Database Schema & Business Flow Audit

This document audits the local PostgreSQL schema against the primary business objective: matching upcoming fixtures to subscribers' favorite teams and sports.

---

## 🗂️ Table Audit Reports

### 1. `tenants` Table
* **Columns:** `id`, `name`, `slug`, `contact_email`, `phone_number`, `address`, `city`, `state`, `postal_code`, `maps_url`, `logo_url`, `primary_color`, `secondary_color`, `theme_mode`, `custom_cta_text`, `is_active`, `created_at`, `public_token`
* **Relationships:** One-to-Many with `subscribers` (references `tenants(id)`).
* **Business Purpose:** Configures pub venues, brand colors, custom CTA text, and widget public authentication tokens.
* **Current Usage:** Stores branding parameters for widget frames and tracks registration metadata.

### 2. `subscribers` Table
* **Columns:** `id`, `tenant_id`, `email`, `whatsapp_number`, `favorite_sports`, `favorite_teams`, `created_at`
* **Relationships:** Many-to-One with `tenants` (referencing `tenants(id)`). One-to-Many with `notification_logs`.
* **Business Purpose:** Stores contact endpoints (WhatsApp/Email) and preferences (sports array and team list arrays).
* **Current Usage:** Populated via widget form actions.

### 3. `matches` Table
* **Columns:** `id`, `league_id`, `competitor_a`, `competitor_b`, `event_title`, `kickoff_time`, `status`, `created_at`
* **Relationships:** Many-to-One with `leagues` (referencing `leagues(id)`). One-to-Many with `notification_logs`.
* **Business Purpose:** Local cache table storing match schedules.
* **Current Usage:** populated via api settings sync runs.

### 4. `leagues` Table
* **Columns:** `id`, `sport_category`, `name`, `localized_name`, `country_code`, `logo_url`, `is_popular`, `created_at`
* **Relationships:** One-to-Many with `matches` (references `leagues(id)`).
* **Business Purpose:** Master table cataloging leagues and sports categories.
* **Current Usage:** Loaded by embed widget views to filter dropdown team lists.

### 5. `notification_logs` Table
* **Columns:** `id`, `subscriber_id`, `match_id`, `channel`, `status`, `error_message`, `sent_at`, `created_at`
* **Relationships:** Many-to-One with `subscribers` (referencing `subscribers(id)`). Many-to-One with `matches` (referencing `matches(id)`).
* **Business Purpose:** Audit logs monitoring message dispatch status.
* **Current Usage:** Populated inline on cron triggers.

---

## 🔍 Business Process Support Evaluation

### Evaluation Question
*Can the current schema support: Subscriber ──► Favorite Team ──► Upcoming Match ──► Notification Candidate ──► Reminder Delivery, without adding new tables?*

### Evaluation Result
**YES**. The current database model contains all relational fields and keys required to support this process.

### Exact Matching Logic Trace
1. **Fetch Upcoming Matches:**
   Query `matches` scheduled to start soon:
   ```sql
   SELECT id, competitor_a, competitor_b, league_id FROM matches 
   WHERE kickoff_time >= NOW() AND kickoff_time <= NOW() + INTERVAL '24 hours' AND status = 'scheduled';
   ```

2. **Retrieve Candidate Subscribers:**
   Query `subscribers` whose preferences overlap with the sports or competitor names from the matches found:
   ```sql
   SELECT s.id, s.email, s.whatsapp_number, s.favorite_sports, s.favorite_teams 
   FROM subscribers s
   WHERE 
     -- Match by Favorite Sport
     s.favorite_sports && ARRAY(
       SELECT l.sport_category FROM leagues l WHERE l.id = :league_id
     )
     OR
     -- Match by Favorite Team
     s.favorite_teams && ARRAY[:competitor_a, :competitor_b];
   ```

3. **Insert Notification Delivery Entries:**
   For every matching subscriber-match candidate pair, insert entry into `notification_logs`:
   ```sql
   INSERT INTO notification_logs (subscriber_id, match_id, channel, status)
   VALUES (:subscriber_id, :match_id, 'whatsapp', 'pending');
   ```
