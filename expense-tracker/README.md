Minimal, browser-first expense tracker built with Next.js, Tailwind CSS, and the App Router. It stores all data locally in `localStorage`, giving you a clean ledger for everyday spending without any external accounts.

## Features

- Fast expense capture with description, amount, category, and date
- Monthly totals, weekly pace, and entry count at a glance
- Top category insights for the current month
- Seed data to preview the layout on first load
- Lightweight minimalist UI designed for desktop and mobile

## Development

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to interact with the tracker. Edits to `app/page.tsx` trigger instant refresh.

## Production build

```bash
npm run build
npm start
```

## Tech stack

- Next.js 14 App Router
- React 18
- Tailwind CSS

## Data export

The ledger persists in the browser under the `minimal-expense-tracker` key. To export your data, open DevTools → Application → Local Storage → copy the JSON value. Clearing that key resets the app.
