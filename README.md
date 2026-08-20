# PaddyLink

Connecting paddy farmers in Karnataka with verified buyers — [paddylink.in](https://paddylink.in)

**Status: Step 1 — Foundation.** Routes are empty placeholders. All page design
comes from the CEO's Figma and lands in later steps.

## Stack

- Next.js (App Router, TypeScript) on Vercel
- Supabase — Postgres, phone/OTP Auth, Storage, Edge Functions
- Plain CSS (global + CSS Modules). No UI framework, no Tailwind — pages are
  built pixel-faithful to Figma.
- Desktop-first: base styles target 1440px. Responsive conversion is a later step.

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in real Supabase values
npm run dev
```

## Project layout

```
src/
  app/                  route placeholders (/, /how-it-works, /buyers, /about,
                        /support, /login, /terms, /privacy, /refund-policy)
  components/T.tsx      <T kn="..." en="..." /> renders the active language
  lib/language.tsx      language context — 'kn' | 'en', default 'kn'
  lib/supabase/         browser + server clients
  styles/tokens.css     CSS variables (colour + type)
supabase/migrations/    SQL migrations
```

### Design tokens

`src/styles/tokens.css` is imported by `src/app/globals.css`. Values are
provisional until the Figma exports arrive.

| Token | Value |
| --- | --- |
| `--cream` | `#F6EFDA` |
| `--emerald-900` | `#1E5B45` |
| `--emerald-950` | `#12362A` |
| `--gold-500` | `#C9A84C` |
| `--gold-300` | `#E3CE8C` |
| `--ink` | `#23283B` |
| `--serif` | Noto Serif → Noto Serif Kannada → Georgia → serif |
| `--sans` | Noto Sans Kannada → system-ui → sans-serif |

Fonts load through `next/font/google` with `display: swap` in
`src/app/layout.tsx`, which exposes them as `--font-noto-serif`,
`--font-noto-serif-kannada` and `--font-noto-sans-kannada`. The `--serif` /
`--sans` tokens reference those variables, so the families actually resolve.

### Language system

`LanguageProvider` wraps the app in the root layout. It defaults to `kn`,
persists the choice to `localStorage` under `paddylink.lang`, and mirrors it
onto `<html lang>`. Use it via the `<T>` component:

```tsx
<T kn="ಭತ್ತ" en="Paddy" />
```

Read or change the language directly with `useLanguage()`, which returns
`{ lang, setLang, toggleLang }`. The visible toggle control ships with the
header in Step 3.

## Supabase setup

### 1. Environment variables

Copy `.env.example` to `.env.local` and fill in the values from
**Supabase Dashboard → Project Settings → API**:

| Variable | Where to find it |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` / public key |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` key — server-side only, never commit |

Add the same three to Vercel under **Project → Settings → Environment
Variables** for Production, Preview and Development.

### 2. Apply the database migration

`supabase/migrations/001_paddylink_schema.sql` is the tested schema and must be
run **unchanged**.

1. Open the [Supabase Dashboard](https://supabase.com/dashboard) and select the
   PaddyLink project.
2. In the left sidebar click **SQL Editor**.
3. Click **New query**.
4. Open `supabase/migrations/001_paddylink_schema.sql`, copy its **entire**
   contents, and paste them into the editor. Do not edit the SQL.
5. Click **Run** (or press `Ctrl/Cmd + Enter`).
6. Confirm it reports success, then open **Table Editor** in the sidebar and
   check that the expected tables are listed.

### 3. Create the `kyc-docs` storage bucket

This bucket holds KYC documents and must stay **private**.

1. In the Supabase Dashboard sidebar click **Storage**.
2. Click **New bucket**.
3. Set **Name** to exactly `kyc-docs`.
4. Leave **Public bucket** switched **off** — the bucket must be private.
5. Click **Save** / **Create bucket**.
6. Verify `kyc-docs` appears in the bucket list marked *Private*.

Access it server-side only, using signed URLs for downloads.

### 4. Enable phone / OTP auth

**Authentication → Sign In / Providers → Phone** — enable it and configure the
SMS provider. Required before `/login` is built.
