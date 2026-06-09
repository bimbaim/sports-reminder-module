Database Architecture Documentation (Phase 1 MVP)
=================================================

This document outlines the relational schema, data types, table structures, and security policies for the PostgreSQL database instance hosted on Supabase. This architecture is custom-designed to support multi-tenant environments for the **Sports Reminder Module**.

📊 Entity Relationship Diagram (ERD) Overview
---------------------------------------------

The database architecture employs a strict **One-to-Many** relational flow from the parent entity (`tenants`) down to the core dependent entity (`subscribers`). The logging layer (`notification_logs`) functions as a transactional junction table mapping subscriber records directly to historical and active schedules (`matches`). The `matches` table serves as a local data cache synchronized periodically from external third-party Sports APIs.

Plaintext

```
+----------------------+          +------------------------+
  |       tenants        |          |      subscribers       |
  +----------------------+          +------------------------+
  | PK | id              |<--------+| PK | id                |
  |    | name            |          | FK | tenant_id         |
  |    | slug            |          |    | email             |
  |    | contact_email   |          |    | whatsapp_number   |
  |    | phone_number    |          |    | favorite_sports   |
  |    | address         |          |    | favorite_teams    |
  |    | city            |          +------------------------+
  |    | state           |                       |
  |    | postal_code     |                       | 1
  |    | maps_url        |                       |
  |    | logo_url        |                       v Many
  |    | primary_color   |          +------------------------+
  |    | secondary_color |          |   notification_logs    |
  |    | theme_mode      |          +------------------------+
  |    | custom_cta_text |          | PK | id                |
  |    | is_active       |          | FK | subscriber_id     |
  +----------------------+          | FK | match_id          |
                                    |    | channel           |
                                    |    | status            |
  +----------------------+          |    | error_message     |
  |       matches        |          |    | sent_at           |
  +----------------------+          +------------------------+
  | PK | id (External)   |<--------+
  |    | sport_type      |
  |    | team_a          |
  |    | team_b          |
  |    | match_time      |
  |    | status          |
  +----------------------+

```

🗂️ Data Dictionary & Table Schemas
-----------------------------------

### 1\. `tenants` Table

Manages core multi-tenant metadata representing individual commercial spaces (e.g., pubs, bars, restaurants) along with their independent interface design attributes and physical location addresses.

-   **`id`** (UUID, PRIMARY KEY): System-generated unique identifier for each tenant. Uses `DEFAULT gen_random_uuid()`.

-   **`name`** (VARCHAR(255), NOT NULL): The legal or trade name of the pub entity.

-   **`slug`** (VARCHAR(255), UNIQUE, NOT NULL): URL-safe identifier string utilized for widget rendering paths.

-   **`contact_email`** (VARCHAR(255), NULL): Business operational contact email.

-   **`phone_number`** (VARCHAR(50), NULL): Business operational telephone contact.

-   **`address`** (TEXT, NOT NULL): Full physical street address of the commercial property.

-   **`city`** (VARCHAR(100), NOT NULL): City where the property is located.

-   **`state`** (VARCHAR(100), NULL): State, province, or region.

-   **`postal_code`** (VARCHAR(20), NULL): Postal or ZIP code.

-   **`maps_url`** (TEXT, NULL): Fully qualified URL link pointing to the Google Maps geolocation reference for dynamic CTA buttons.

-   **`logo_url`** (TEXT, NULL): Fully qualified URL pointing to the tenant's brand asset logo.

-   **`primary_color`** (VARCHAR(7), NOT NULL): Hexadecimal color code representing the primary design interface tone. Uses `DEFAULT '#000000'`.

-   **`secondary_color`** (VARCHAR(7), NOT NULL): Hexadecimal color code representing the secondary design interface tone. Uses `DEFAULT '#FFFFFF'`.

-   **`theme_mode`** (VARCHAR(20), NOT NULL): Interface styling standard configuration (`light` or `dark`). Uses `DEFAULT 'dark'`.

-   **`custom_cta_text`** (VARCHAR(100), NOT NULL): Customized action string rendered within the submit action element. Uses `DEFAULT 'Remind Me'`.

-   **`is_active`** (BOOLEAN, NOT NULL): Flag controlling the runtime processing state of the tenant widget instance. Uses `DEFAULT true`.

-   **`created_at`** (TIMESTAMPTZ, NOT NULL): Record creation timestamp. Uses `DEFAULT NOW()`.

### 2\. `subscribers` Table

Captures end-user subscription records routed directly from client-side embedded web forms. Supports multi-sport selections.

-   **`id`** (UUID, PRIMARY KEY): Unique subscriber identifier. Uses `DEFAULT gen_random_uuid()`.

-   **`tenant_id`** (UUID, FOREIGN KEY, NOT NULL): Relational key linking the user directly to the originating pub instance. References `tenants(id) ON DELETE CASCADE`.

-   **`email`** (VARCHAR(255), NOT NULL): Target email address for parallel or fallback Resend dispatches.

-   **`whatsapp_number`** (VARCHAR(50), NOT NULL): Target WhatsApp phone number in standard international format.

-   **`favorite_sports`** (VARCHAR(50)[], NOT NULL): Array of selected sports categories (e.g., `{'football', 'ufc'}`). Uses `DEFAULT '{football}'::VARCHAR[]`.

-   **`favorite_teams`** (VARCHAR(100)[], NOT NULL): Array of selected national teams or athletes corresponding to chosen sports (e.g., `{'Argentina', 'France'}`).

-   **`created_at`** (TIMESTAMPTZ, NOT NULL): Subscription timestamp. Uses `DEFAULT NOW()`.

> **Composite Unique Constraint:** `UNIQUE(tenant_id, whatsapp_number)`. Structurally prevents duplicate subscription pipelines for a single user at a single pub location.

### 3\. `matches` Table

Maintains sports fixture matrices synchronized via background data ingestion workers. This table serves as a local application cache to minimize external third-party API query consumption.

-   **`id`** (VARCHAR(100), PRIMARY KEY): Upstream unique fixture ID mapped directly from the external Sports API reference.

-   **`sport_type`** (VARCHAR(50), NOT NULL): Branch category identifier (e.g., `football`, `ufc`, `nba`). Uses `DEFAULT 'football'`.

-   **`team_a`** (VARCHAR(100), NOT NULL): Home competitor, Competitor A, or Fighter A.

-   **`team_b`** (VARCHAR(100), NOT NULL): Away competitor, Competitor B, or Fighter B.

-   **`match_time`** (TIMESTAMPTZ, NOT NULL): Scheduled kickoff time, strictly parsed and committed in UTC format.

-   **`status`** (VARCHAR(50), NOT NULL): Live fixture status such as `scheduled`, `live`, or `finished`. Uses `DEFAULT 'scheduled'`.

-   **`created_at`** (TIMESTAMPTZ, NOT NULL): Database sync execution timestamp. Uses `DEFAULT NOW()`.

### 4\. `notification_logs` Table

Tracks real-time transaction states handled by the BullMQ background processing queue.

-   **`id`** (UUID, PRIMARY KEY): Unique log transaction token. Uses `DEFAULT gen_random_uuid()`.

-   **`subscriber_id`** (UUID, FOREIGN KEY, NOT NULL): Target recipient account mapping. References `subscribers(id) ON DELETE CASCADE`.

-   **`match_id`** (VARCHAR(100), FOREIGN KEY, NOT NULL): Contextual sport event relation. References `matches(id) ON DELETE CASCADE`.

-   **`channel`** (VARCHAR(50), NOT NULL): Dispatch medium selection, either `whatsapp` or `email`.

-   **`status`** (VARCHAR(50), NOT NULL): Worker execution state such as `pending`, `success`, or `failed`. Uses `DEFAULT 'pending'`.

-   **`error_message`** (TEXT, NULL): Raw error payload dropped from upstream gateways upon delivery failure.

-   **`sent_at`** (TIMESTAMPTZ, NULL): Exact timestamp indicating successful gateway delivery acknowledgment.

-   **`created_at`** (TIMESTAMPTZ, NOT NULL): Worker execution generation timestamp. Uses `DEFAULT NOW()`.

🔒 Row Level Security (RLS) & Access Rules
------------------------------------------

To enforce data isolation across multi-tenant scopes, all native database tables apply strict **Row Level Security (RLS)** guardrails.

1.  **Public Access Restriction:** External browser executions and embedded scripts are strictly prohibited from making direct mutations or reads on tables using the public Supabase Anon Key.

2.  **Serverless Server Executions (RLS Bypass):** Data pipeline ingestion is exclusively routed through Next.js serverless API paths and BullMQ workers executing with the high-privilege `SPORTS_REMINDER_SERVICE_ROLE_KEY` via the internal `service_role` database group.

SQL

```
-- Enforce Row Level Security Guardrails
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- Grant Full Command Scope Exclusively to Internal Server Engines
CREATE POLICY "Allow backend service_role full access" ON tenants FOR ALL TO service_role USING (true);
CREATE POLICY "Allow backend service_role full access" ON subscribers FOR ALL TO service_role USING (true);
CREATE POLICY "Allow backend service_role full access" ON matches FOR ALL TO service_role USING (true);
CREATE POLICY "Allow backend service_role full access" ON notification_logs FOR ALL TO service_role USING (true);

```