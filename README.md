# Hearth

A desktop-only money desk and recipe box in the browser. Each person signs up, then keeps their own ledger, categories, charts, recipes, and grocery list.

## What it does

- **Sign up / sign in** with username and password (same flow as [MyPlaylist](https://github.com/Shreesoni520/MyPlaylist))
- **Ledger** — income vs spend, categories, monthly envelopes, search, CSV import and export
- **Desk** — charts, leftover money, category bars, recent lines
- **Recipe box** — save recipes, scale servings, tick ingredients
- **Grocery list** — grouped by aisle, from ticked ingredients or typed by hand
- **Desktop only** — phones and small screens see a “use a computer” page

No PHP. The app is **Next.js + TypeScript** with a **SQLite** database via Prisma.

## Run locally

You need Node.js 20+ (not XAMPP/PHP).

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) on a laptop or desktop.

On Windows you can also double-click `start-server.bat`.

## Public deploy

Set these environment variables:

```
DATABASE_URL="file:./dev.db"
SESSION_SECRET="a-long-random-string"
```

SQLite is fine for a first public version on a single server. For Vercel, switch `DATABASE_URL` to a hosted Postgres URL and change `provider` in `prisma/schema.prisma` to `postgresql`.
