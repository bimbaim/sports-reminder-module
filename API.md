# API.md - Route Endpoints & Server Actions Audit

## 🌐 HTTP API Endpoints

### 1. `/api/cron/sync-matches`
* **Method:** `GET`
* **Purpose:** Triggers sync for matches from sport API settings, updates the cache, matches against subscriber teams, and mocks notification deliveries.
* **Authentication Required:** No (Bearer validation is commented out).
* **Request Schema:** None.
* **Response Schema:** 
  ```json
  {
    "success": boolean,
    "message": string,
    "error": string
  }
  ```
* **Dependencies:** Supabase Admin client, database tables (`matches`, `subscribers`, `notification_logs`).
* **Called By:** Vercel Cron Scheduler (configured via `vercel.json` - *missing file*).
* **Risk Level:** **HIGH**
  * *Reason:* Mismatched database column names cause it to fail on invocation. Commented authentication permits anyone to trigger match sync mock dispatches.

### 2. `/api/webhooks/whatsapp`
* **Method:** `GET`, `POST`
* **Purpose:** Handles Meta WhatsApp Cloud API webhook verification (GET) and receives incoming status updates/messages (POST).
* **Authentication Required:** 
  * GET: Hub Verify Token validation.
  * POST: X-Hub-Signature-256 HMAC verification using App Secret.
* **Request Schema (POST):** Meta Webhook JSON Payload.
* **Response Schema:** 
  ```json
  {
    "success": boolean,
    "processed": number,
    "error": string
  }
  ```
* **Dependencies:** `WhatsAppService`, Supabase Admin client, `notification_logs` table.
* **Called By:** Meta WhatsApp Cloud API.
* **Risk Level:** **MEDIUM**
  * *Reason:* Processes incoming external traffic. Secured by HMAC signature verification.

### 3. `/auth/confirm`
* **Method:** `GET`
* **Purpose:** Handles verification of email OTP token hashes redirected from Supabase authentication mailings.
* **Authentication Required:** No.
* **Request Schema:** Query Params:
  * `token_hash`: string (required)
  * `type`: string (EmailOtpType, required)
  * `next`: string (optional redirect destination, default `/`)
* **Response Schema:** Redirects (`307`) to `/dashboard` or `/` on success, or `/auth/error` on failure.
* **Dependencies:** Supabase Server Client.
* **Called By:** Supabase Auth SMTP service.
* **Risk Level:** **LOW**

---

## ⚡ Server Actions (RPCs)

### 1. `getTeamsForLeagues(leagueIds: number[])`
* **File:** [actions.ts](file:///d:/WORK/WHELLO/NON-WORDPRESS/sports-reminder-module/app/embed/[tenant-slug]/actions.ts#L5)
* **Purpose:** Fetches all distinct competitor names matching the provided league IDs.
* **Authentication Required:** No.
* **Request:** Array of numbers (league IDs).
* **Response:** `string[]` (sorted list of competitor names).
* **Risk Level:** **LOW**

### 2. `subscribeToTenant(tenantId: string, formData: FormData)`
* **File:** [actions.ts](file:///d:/WORK/WHELLO/NON-WORDPRESS/sports-reminder-module/app/embed/[tenant-slug]/actions.ts#L28)
* **Purpose:** Parses input data and inserts a new subscriber record.
* **Authentication Required:** No.
* **Request:** Tenant UUID and `FormData` (containing `email`, `whatsapp_number`, `favorite_sports`, `favorite_teams`).
* **Response:** `{ success: boolean, error?: string }`
* **Risk Level:** **LOW**
