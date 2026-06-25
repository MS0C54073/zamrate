# ZamRate — The People's Pulse of Zambia 🇿🇲

> Real reviews. Real experiences. Real impact.

ZamRate is a **privacy-first, anonymous** company rating platform built for the people of Zambia. No accounts, no tracking, no personal data — just honest community feedback that drives transparency and accountability across banks, telcos, healthcare, education, retail, energy, transport and more.

## ✨ Features

- **Anonymous ratings & reviews** — rate any company without signing up
- **Real brand identity** — every company card pulls its real logo via favicon resolution, with a known-domain map for major Zambian brands (Zanaco, Stanbic, MTN, Airtel, ZESCO, Absa, FNB, Cavmont, ZAMTEL, Bank of Zambia, and more)
- **Category explorer** — Banks, Telcos, Health, Education, Retail, Energy, Transport
- **Live activity feed** — see anonymous ratings stream in over Realtime
- **Suggest a company** — community-driven catalogue, moderated by admins
- **Light & dark mode** — warm civic palette tuned for both
- **Hero with the real Zambian flag** waving over a soft Lusaka skyline

## 🎨 Design

- **Typography:** Fraunces (display) + Inter (body)
- **Light mode:** warm off-white, deep navy ink, teal primary, sun-gold accent
- **Dark mode:** deep navy `220 32% 8%`, teal primary `174 62% 52%`, warm cream text `40 30% 94%`, gold accent `38 92% 62%`
- **Components:** shadcn/ui on Tailwind CSS, fully semantic design tokens — no hard-coded colors
- **Icons:** Lucide

## 🛡️ Security & Privacy

- **No personal data collected** — anonymous IDs are random, browser-local
- **Row Level Security** on every public table
- **Strict ownership checks** on rating/vote updates (anonymous ID matched via request header — no `OR true` bypasses)
- **PII columns locked down** — `email`, `phone`, and `anonymous_user_id` are not readable by anonymous clients
- **Security-definer helpers** live in a private schema, not exposed via the API
- **Realtime locked** to `postgres_changes` only

## 🧱 Tech Stack

- **Frontend:** React 18, Vite 5, TypeScript 5, Tailwind CSS v3, shadcn/ui
- **Backend:** Lovable Cloud (Postgres + Auth + Realtime + Storage + Edge Functions)
- **State:** TanStack Query
- **Routing:** React Router

## 🚀 Local development

```bash
npm install
npm run dev
```

The app runs at `http://localhost:8080`.

## 📦 Deployment

Open the project in [Lovable](https://lovable.dev) and click **Publish**. Custom domains are configured under Project → Settings → Domains.

---

Built with ❤️ for Zambia.
