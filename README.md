# FreelanceFlow — Payment & Income Manager

A modern, fintech-style web app that helps freelancers manage invoices, track
income, keep tabs on clients, and estimate taxes. Built with **Next.js 15**
(App Router), **Supabase** (Postgres + Auth with Row Level Security), and
**Tailwind CSS**. Installable as a **PWA** with light/dark mode.

## Features

- **Auth** — email/password signup & login via Supabase Auth. Every freelancer's
  data is private and isolated by Row Level Security.
- **Dashboard** — income this month & this year, pending/overdue invoice counts,
  recent activity, a 12-month income chart, and quick actions.
- **Invoice Manager** — create/edit/delete invoices (client, service, amount,
  due date), track status (Draft / Sent / Paid / Overdue), and mark paid in one
  click. Overdue is derived automatically from the due date.
- **Income Tracker** — log payments, filter by month/client/project type, view a
  monthly income bar chart, and export to CSV.
- **Client Manager** — add/edit/delete clients, view full payment history per
  client, and flag slow payers (manually or automatically).
- **Tax Estimator** — set a tax percentage and instantly see how much to set
  aside per payment and in total.
- **Design** — clean, minimal, responsive; dark/light toggle; installable PWA.

## Tech stack

| Layer     | Choice                                            |
| --------- | ------------------------------------------------- |
| Framework | Next.js 15 (App Router, Server Actions)           |
| Language  | TypeScript                                        |
| Styling   | Tailwind CSS (CSS-variable theming)               |
| Backend   | Supabase (Postgres, Auth, RLS)                    |
| Charts    | Custom, dependency-free SVG/flex bar chart        |
| Icons     | lucide-react                                      |
| Hosting   | Vercel                                            |

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env.local` and fill in your Supabase project values
(Project Settings → API). **Only** the URL and the anon (public) key belong here.

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
```

> ⚠️ The **service_role** key must never be placed in a `NEXT_PUBLIC_*` variable
> or shipped to the browser. This app does not use it at all — RLS + the anon key
> keep each user's data private.

### 3. Set up the database

Open the Supabase dashboard → **SQL Editor** → **New query**, paste the contents
of [`supabase/schema.sql`](supabase/schema.sql), and run it. This creates the
`profiles`, `clients`, `invoices`, and `payments` tables with RLS policies and a
trigger that auto-creates a profile on signup. The script is idempotent.

### 4. (Optional) Email confirmation

By default Supabase requires users to confirm their email before signing in. The
app handles this (a "check your email" screen + `/auth/callback` handler). For
frictionless local testing you can turn it off in the dashboard:
**Authentication → Providers → Email → Confirm email → off**.

### 5. Run

```bash
npm run dev
# http://localhost:3000
```

## Deployment (Vercel)

1. Push this repository to GitHub.
2. Import the repo in Vercel.
3. Add the two environment variables (`NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`) in the Vercel project settings.
4. Deploy. In Supabase → **Authentication → URL Configuration**, add your Vercel
   URL to the **Site URL** / **Redirect URLs** so email links resolve correctly.

## Project structure

```
src/
  app/
    (app)/            # authenticated area (sidebar + mobile nav)
      dashboard/  invoices/  income/  clients/  tax/
    auth/callback/    # email-confirmation code exchange
    login/  signup/   # auth pages
    layout.tsx        # root layout, theme provider, PWA
    middleware.ts     # (src/middleware.ts) session refresh + route guard
  components/
    ui/               # design-system primitives
    app/              # sidebar, mobile nav, page header
    invoices/ payments/ clients/  # reusable form modals
    charts/           # income bar chart
  lib/
    supabase/         # browser/server/middleware clients
    data/             # server-side read queries
    actions/          # server actions (mutations)
    utils.ts  constants.ts  types.ts
supabase/schema.sql   # database schema + RLS
public/               # manifest, service worker, icons
```

## Data model

- **profiles** — per-user settings (tax rate, currency). Auto-created on signup.
- **clients** — people/companies you invoice. `is_flagged` marks slow payers.
- **invoices** — status `draft|sent|paid|overdue`; overdue is derived from the
  due date at read time.
- **payments** — income records; the source of truth for all income totals.
  Marking an invoice paid creates a linked payment.

All tables carry a `user_id` and are protected by RLS so users only ever see
their own rows.
