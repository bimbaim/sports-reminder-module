# Sports Reminder Module

An event-driven automated notification system that allows users to subscribe to sports match reminders via WhatsApp. The system utilizes a decoupled architecture featuring a lightweight client-side embeddable form script, Supabase for data management, Next.js for the backend API layer, and Vercel Cron Jobs as the daily execution scheduler.

---

## 🚀 Key Features & Development Phases

### Phase 1: Form & Database Integration
* **Embeddable Form Script:** A lightweight client-side JavaScript script (Vanilla JS/Vite) that can be embedded into any third-party website using an Iframe or Web Component mechanism.
* **Form Backend API:** A Next.js Serverless endpoint (`/api/embed-form`) equipped with strict CORS configurations to securely ingest payloads from external domains.
* **Database Infrastructure:** A PostgreSQL instance hosted on Supabase to store target WhatsApp phone numbers and selected Team IDs.

### Phase 2: Cron Job & Automated WhatsApp Notification
* **Daily Scheduler:** Managed via Vercel Cron Jobs to trigger automation tasks daily at a designated execution window.
* **Third-Party Sports API Integration:** Real-time fixture verification using API-SPORTS or Football-Data.org matching against unique active Team IDs pulled from the database.
* **WhatsApp Gateway:** Seamless communication layer via Whapi.cloud or Twilio to dispatch match-day alerts directly to target user devices.

---

## 🛠️ System Workflow Architecture

1.  **User Submit:** The user submits registration data through the embedded form widget -> The payload is targeted to the Next.js API endpoint.
2.  **Data Persistence:** The Next.js API validates the phone number format and updates the Supabase data layer.
3.  **Cron Trigger:** The Vercel Cron engine fires the scheduled daily script execution route.
4.  **Batch & Cache Logic:** The system aggregates unique active Team IDs, calls the external Sports API, caches today's fixture matrix in a temporary table, and bypasses hitting external API limits per user.
5.  **Dispatch Alerts:** The system references user subscription arrays against cached fixtures and passes valid matches to the WhatsApp Gateway endpoint to deliver the notifications.

---

## 📁 Project Directory Reference

```text
├── app/
│   ├── api/
│   │   ├── embed-form/         # Form submission receiver endpoint (CORS enabled)
│   │   └── cron/
│   │       └── send-reminder/  # Daily WhatsApp scheduler cron execution route
│   ├── components/             # Internal visual layout components (shadcn/ui)
│   └── layout.js
├── public/
│   └── embed-script.js         # Client-side JavaScript widget core entry point
├── vercel.json                 # Vercel Cron execution frequency rules configuration
├── package.json
└── README.md