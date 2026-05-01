# ZamRate — The People's Pulse for Zambia 🇿🇲

**ZamRate** is an anonymous, citizen-driven rating platform for Zambian companies, institutions, and public services. Citizens rate, comment, and hold service providers accountable — no accounts, no tracking, no cost.

> Live: https://zamrate.lovable.app

---

## ✨ Features

### Public experience
- **Browse companies** by category (Banks, Telcos, Government, Health, Utilities, Retail, Transport, Education, etc.)
- **Search** by name, category, service, or description
- **Anonymous star ratings** (1–5) — one per visitor, per company
- **Rating change limit** — up to **3 edits**, then your rating is **locked** (enforced by a database trigger)
- **Anonymous comments and threaded replies** (max 2,000 chars), held in moderation until approved
- **Suggest a missing company** for the admin team to review
- **Report abusive comments** with a reason
- **Real-time updates** — new ratings, averages, and approved comments appear instantly without refreshing
- **Relative timestamps** on every comment (`12s ago`, `4h ago`, `3d ago`) that auto-tick every 30 seconds
- **Dark / light theme toggle** that respects system preference and persists across sessions
- **Privacy-first** — no accounts, no emails, no IPs stored. Each visitor gets a random anonymous ID in their browser

### Admin dashboard (`/admin`)
Accessed via the 🔒 lock button in the bottom-right corner.

| Role          | Capabilities                                                                          |
|---------------|----------------------------------------------------------------------------------------|
| **Super Admin** | Everything: manage roles, delete content, configure platform, view audit logs        |
| **Admin**       | Manage companies, comments, suggestions, reports, block users                       |
| **Sub Admin**   | Approve / reject companies and suggestions                                          |
| **Moderator**   | Approve, reject, or remove comments and replies                                     |

Dashboard pages:
- **Overview** — platform metrics
- **Companies** — full CRUD with logo upload (`company-logos` bucket)
- **Comments** — moderation queue (approve / reject / delete, soft-delete supported)
- **Reports** — review user-reported comments
- **Suggestions** — promote suggested companies into the live catalogue
- **Users** — view anonymous activity, block / unblock abusive IDs
- **Sub-Admins** — grant or revoke staff roles (super-admin only)
- **Audit Logs** — full immutable trail of every admin action
- **Settings** — platform configuration

---

## 🧱 Tech Stack

- **React 18** + **Vite 5** + **TypeScript 5**
- **Tailwind CSS v3** with a semantic HSL design-token system (`src/index.css`)
- **shadcn/ui** components
- **Lovable Cloud** (managed Supabase) — Postgres, Auth, Storage, Realtime, RLS
- **TanStack Query** for data caching
- **React Router v6** for routing

---

## 🗄️ Database Schema

| Table                | Purpose                                                                    |
|----------------------|----------------------------------------------------------------------------|
| `companies`          | Catalogue (name, category, description, services, logo, status)            |
| `ratings`            | 1–5 stars per anonymous visitor per company, capped at 3 changes           |
| `comments`           | Threaded anonymous comments (status: pending / approved / rejected)        |
| `company_suggestions`| Public-submitted companies awaiting review                                 |
| `reported_comments`  | Abuse reports filed against comments                                       |
| `blocked_users`      | Banned anonymous IDs (RLS blocks their ratings, comments, suggestions)     |
| `user_roles`         | Admin role assignments — separate table to prevent privilege escalation    |
| `admin_audit_logs`   | Append-only history of every admin action                                  |

**Security**
- Row-Level Security on every table
- Roles stored in dedicated `user_roles` table (never on profiles)
- `has_role()`, `is_admin_tier()`, `is_blocked()` `SECURITY DEFINER` helpers prevent recursive RLS
- Rating limits enforced by `validate_rating()` trigger
- Comment / suggestion / report inserts blocked for users in `blocked_users`

---

## ⚡ Real-time

Realtime is enabled on `ratings` and `comments`. The app subscribes to:
- `public-listings` channel on the home page → rating averages and counts refresh live
- `company-{id}` channel inside the company detail dialog → new comments, replies, and rating changes appear instantly for everyone viewing the same company

Combined with the 30-second timestamp tick, the feed feels alive without manual refreshes.

---

## 📁 Project Structure

```
src/
├── components/
│   ├── admin/AdminLayout.tsx       # Sidebar shell for /admin
│   ├── AdminLockButton.tsx         # Floating 🔒 entry point
│   ├── CompanyCard.tsx             # Listing card
│   ├── CompanyDetailDialog.tsx     # Rating + comments + realtime
│   ├── StarRating.tsx              # Interactive 5-star input
│   ├── SuggestCompanyDialog.tsx    # Public suggestion form
│   ├── ThemeToggle.tsx             # Dark / light switch
│   └── ui/                         # shadcn/ui primitives
├── hooks/
│   ├── useAdmin.ts                 # Role + permission helpers
│   └── useTheme.ts                 # Theme persistence
├── lib/
│   ├── anonId.ts                   # Per-visitor anonymous ID
│   └── categories.ts               # Category metadata + icons
├── pages/
│   ├── Index.tsx                   # Public homepage
│   ├── AdminLogin.tsx              # Email-link admin auth
│   └── admin/                      # Overview, Companies, Comments,
│                                   #   Reports, Suggestions, Users,
│                                   #   SubAdmins, AuditLogs, Settings
└── integrations/supabase/          # Auto-generated client + types
```

---

## 🚀 Local Setup

```bash
bun install
bun run dev
```

The `.env` is auto-generated by Lovable Cloud and contains:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

> Database migrations live in `supabase/migrations/` and are applied automatically by Lovable Cloud.

---

## 🎨 Design System

- **Brand**: Saffron Civic Plaza — warm clay + saffron primary on neutral surfaces
- **Typography**: Display serif headings, geometric sans body
- All colors live as HSL CSS variables in `src/index.css`. **Never hard-code colors in components** — always use semantic tokens (`bg-background`, `text-primary`, `border-accent`, etc.)
- Light + dark modes both fully themed

---

## 📜 License

Built for the people of Zambia. Free to use, free to fork, free to improve.

---

_Last updated: this README is maintained alongside the codebase and reflects the current state of the system._
