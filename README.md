# Selvam Sarees — Spin & Win

A mobile-first in-store contest hosted on GitHub Pages, with secure prize selection and winner storage in a Supabase Edge Function.

## Live architecture

- `public/` — static GitHub Pages website
- `supabase/functions/spin/` — server-side weighted prize selection
- `supabase/migrations/` — private winner table with one mobile number per spin

The browser never receives the service-role key and cannot read the winner table.

## One-time Supabase setup

1. Open the project's **SQL Editor** in the Supabase dashboard.
2. Paste and run `supabase/migrations/202606300001_create_spins.sql`.
3. Open **Edge Functions**, create a function named `spin`, and replace its code with `supabase/functions/spin/index.ts`.
4. Deploy the function with JWT verification disabled. Requests are restricted to the Selvam Sarees GitHub Pages origin in the function itself.

The public website calls:

`https://tpqwbsochispnohwaowq.supabase.co/functions/v1/spin`

## GitHub Pages setup

In the GitHub repository, open **Settings → Pages** and select **GitHub Actions** as the source. Every push to `main` publishes `public/` automatically.

Expected URL:

`https://iamajeeth.github.io/spinner-contest/`

## Viewing winners

Open **Supabase → Table Editor → spins**. Each row contains the mobile number, prize, coupon code, and claim time.

## Local preview

```powershell
npm start
```

Then open `http://localhost:3000`.
