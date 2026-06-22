# ZamRate — The People's Pulse: Zambia

ZamRate is a citizen-driven, privacy-first review platform for Zambian companies and public services. Real reviews. Real experiences. Real impact.

## Highlights

- 🇿🇲 **Built for Zambia** — categories, companies and copy localized for the Zambian market.
- 🛡️ **Privacy-first** — 100% anonymous ratings. No tracking, no personal data collected from raters.
- ⭐ **Honest ratings** — 1–5 star ratings with comments, surfaced as top-rated companies per category.
- 📡 **Live activity** — see new ratings stream in as they happen.
- 🏛️ **Real categories** — Banks, Telcos, Health, Education, Retail, Energy, Transport and more.

## Tech stack

- **Frontend:** React 18 + Vite 5 + TypeScript + Tailwind CSS v3 + shadcn/ui
- **Backend:** Lovable Cloud (Postgres, Auth, Realtime, Storage, Edge Functions)
- **Icons:** lucide-react
- **Typography:** Fraunces (display) + Plus Jakarta Sans (body)

## Design system

A warm civic palette with a Zambian sensibility:

- **Primary:** deep teal (Zambian green-adjacent)
- **Accent:** warm gold (eagle / sovereignty)
- **Light mode:** soft sky/ivory background, crisp cards
- **Dark mode:** deep navy slate, teal accents, warm cream text — readable and elegant

The hero features the Zambian flag layered over a soft Lusaka skyline illustration as the section background.

## Getting started

```bash
npm install
npm run dev
```

Open the URL printed by Vite (usually http://localhost:8080).

## Security

The schema is protected by Row-Level Security on every public table. Helper functions used inside policies (`has_role`, `is_admin_tier`, `is_blocked`) live in a private schema and are not exposed to the Data API. Rating updates/deletes are scoped to the `x-anon-id` header — no `OR true` escape hatches.

## License

© ZamRate. Built for the people of Zambia.
