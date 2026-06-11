# SAFE_TO_REFACTOR.md - Refactoring Zones & Risk Analysis

This document categorizes directories and modules by refactoring safety levels to guide developers and agents.

---

## 🟢 SAFE (Low Risk)
*These components can be refactored with minimal risk of breaking core business flows.*

* **`components/ui/`**
  * *Rationale:* Standard presentation styles (buttons, card, input, badges) powered by Tailwind CSS.
  * *Strategy:* Maintain class names and prop signatures.
* **`components/theme-switcher.tsx`**
  * *Rationale:* Manages local theme settings using `next-themes`.

---

## 🟡 CAUTION (Medium Risk)
*Requires regression testing, especially matching fields against database column keys.*

* **`app/embed/[tenant-slug]/widget-form.tsx`**
  * *Rationale:* Handles multi-step form state (selected leagues, fetching teams dynamically, validation checks). Mismatches will break the subscription form on external client sites.
  * *Strategy:* Verify that `availableTeams` loading from Server Actions maps accurately to state objects.
* **`app/dashboard/matches/actions.ts`**
  * *Rationale:* Handles API integration with RapidAPI / API-Sports. Changes to parsing logic could break synchronization.
  * *Strategy:* Run sync with mocked mock responses first.

---

## 🔴 DANGEROUS (High Risk)
*Do not touch unless thoroughly analyzing security and session configurations.*

* **`lib/supabase/`**
  * *Rationale:* Contains client, server, admin, and session manager initializations. Next.js App Router and Supabase cookie handling are extremely sensitive; minor errors can cause random user logout issues or security leaks of the `service_role` key.
  * *Strategy:* Never save client objects globally. Always initialize new instances inside each server/action hook as recommended for Next.js computing environments.
* **`schema_sql/`**
  * *Rationale:* Migration history files. Modifying existing SQL files directly will create schema drift.
  * *Strategy:* Always append new migration files instead of editing historical ones.
* **`proxy.ts` (root)**
  * *Rationale:* Next.js Middleware controller. Any changes here will directly affect authentication redirects across the entire application router.
  * *Strategy:* Rename it to `middleware.ts` before modifying to ensure Next.js runs it.
