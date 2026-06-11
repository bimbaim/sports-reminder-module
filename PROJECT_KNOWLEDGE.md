# PROJECT_KNOWLEDGE.md - Domain & Business Rules

## 📖 Domain Terms
* **Tenant (Pub):** A commercial venue subscribing to the service to embed signup widgets.
* **Subscriber:** An end-user subscribing to get notified of matches.
* **Match:** An event fixture stored locally.
* **League:** A competition category (e.g. Premier League, UFC Card).
* **Notification Log:** A status record of WhatsApp/Email reminders.

---

## 💼 Business Rules
* **Subscription Isolation:** A subscriber can be linked to multiple tenants but can only subscribe once per tenant/WhatsApp number combination (`unique_tenant_subscriber`).
* **RLS Protection:** The client cannot read/write directly to Supabase. All writes must go through server-side routines using the admin client.

---

## 🔒 Hidden Assumptions
* **Meta Template Approval:** WhatsApp messages require pre-approved templates from Meta Cloud.
* **Local time sync:** Sports matches are stored in UTC TIMESTAMPTZ, but widget renders matches localized to the browser's timezone.

---

## 🗺️ User Journey
1. **Admin Setup:** Admin adds tenant via Dashboard.
2. **Embed Script:** Pub embeds `widget.js` script pointing to their public token.
3. **User Selection:** Visitor chooses leagues, filters teams, enters WhatsApp/Email, and subscribes.
4. **Automated Reminders:** Cron jobs query matching upcoming fixtures and queue notifications.

---

## ⚠️ Known Limitations
* **BullMQ Absent:** Redis and queue processing is completely mocked with `setTimeout`.
* **Ignored Middleware:** Unprotected admin routing due to middleware misnaming (`proxy.ts` vs `middleware.ts`).

---

## ⚙️ Operational Constraints
* **Free API Quota Limits:** Upstream sports APIs limit daily calls. Heavy calls during sync triggers fallbacks.
* **WhatsApp Delivery Formatting:** Standard WhatsApp delivery depends on proper international numbers (`+` prefix).

---

## 🔮 Future Risks
* **Data Scale:** In-memory filtering of subscribers in the sync match route will fail with high volumes.
* **Schema Drifts:** Mismatch of match table schemas in existing files will cause runtime errors on database migration executions.
