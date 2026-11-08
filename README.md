# APEX STEWARD — local development

## Requirements

- Node.js 24 or newer
- npm
- A Google service account with access to the incident spreadsheet
- A Supabase project for the leaderboard

## Install and run

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Google Sheets

Keep the existing Google Sheets incident database configuration in your private `.env.local` file. Never commit the service-account JSON file or `.env.local`.

## Supabase leaderboard setup (Dev Build 0.3)

The incident library remains in Google Sheets. Supabase stores only leaderboard callsigns, a one-way hash of the anonymous browser token, best score, grade, fastest-lap time, and timestamps.

1. Create a free Supabase project at https://supabase.com.
2. Open the project's SQL Editor.
3. Run the complete SQL file at `supabase/migrations/202611090001_leaderboard.sql`.
4. In Supabase project settings, copy the project URL and the **service_role** secret key.
5. Add these two variables to your local `.env.local` file:

```dotenv
SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_SECRET
```

Do not prefix the service-role key with `NEXT_PUBLIC_`. It must never be exposed to the browser or committed to Git. Row Level Security is enabled and direct browser access is revoked; all database operations go through server-side API routes.

After adding the variables, restart the Next.js development server.

## Leaderboard behaviour

- Players must explicitly opt in; private play never submits a result.
- Callsigns are unique regardless of letter case.
- The random callsign generator has more than one million possible suffix combinations for each generated word pair.
- A secure, anonymous, first-party browser cookie lets a returning opted-in player update their own entry. Clearing browser data or changing browsers/devices loses that link; there are no accounts or fingerprinting.
- Only a player's best score is retained. Championship points rank first, fastest lap ranks second, and earliest submission breaks an exact tie.
- Administrators can remove inappropriate entries from **Admin → Global leaderboard**.

## Scoring

Each incident awards up to 15 points for the responsibility finding and 10 points for the outcome. When responsibility is officially undetermined or marked unscorable, those 15 possible points are excluded from the player's denominator for that incident.

Scoring rules are versioned as `0.3` in the database so future rule changes can be distinguished from historic results.
