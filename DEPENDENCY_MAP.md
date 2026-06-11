# DEPENDENCY_MAP.md - Module Dependency Mapping

## 🌳 System Dependency Trees

### 1. Embedded Widget flow
```
[widget.js] (Third-party site)
  └─► [/embed/[tenant-slug]/page.tsx] (iframe Target)
        ├─► [WidgetForm] (widget-form.tsx)
        │     ├─► [getTeamsForLeagues] (actions.ts Server Action)
        │     │     └─► [createAdminClient] (lib/supabase/admin.ts)
        │     │           └─► Supabase REST API (matches)
        │     └─► [subscribeToTenant] (actions.ts Server Action)
        │           └─► [createAdminClient] (lib/supabase/admin.ts)
        │                 └─► Supabase REST API (subscribers)
        └─► [createAdminClient] (lib/supabase/admin.ts)
              ├─► Database (tenants)
              └─► Database (leagues)
```

### 2. Admin Matches Manager flow
```
[/dashboard/matches/page.tsx]
  ├─► [MatchesClient] (matches-client.tsx)
  ├─► [ingestSportData] (actions.ts Server Action)
  │     └─► [createAdminClient] (lib/supabase/admin.ts)
  │           ├─► Database (sport_settings)
  │           ├─► Database (leagues)
  │           └─► Database (matches)
  └─► [createAdminClient] (lib/supabase/admin.ts)
        ├─► Database (leagues)
        ├─► Database (matches)
        └─► Database (sport_settings)
```

---

## 🔍 Dead & Duplicate Dependencies

* **Duplicate / Unused Packages:**
  * `radix-ui` is listed in `package.json` alongside specific sub-packages (e.g. `@radix-ui/react-checkbox`, `@radix-ui/react-label`, etc.). The global `radix-ui` package is unused.
  * `date-fns` is included in `dependencies` but only standard date manipulations are performed in `/api/cron/sync-matches/route.ts` and `/embed/[tenant-slug]/actions.ts`.
