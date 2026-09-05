<p align="center">
  <img src="public/shreevault-s.png" width="72" height="72" alt="ShreeVault" />
</p>

<h1 align="center">ShreeVault</h1>

<p align="center">
  <strong>Your private finance desk.</strong><br />
  Sign in. Log the money. Cook from the same place.
</p>

<p align="center">
  <a href="https://shree-s-vault.vercel.app"><img alt="Live site" src="https://img.shields.io/badge/Live-shree--s--vault.vercel.app-black?style=for-the-badge" /></a>
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=nextdotjs" />
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img alt="Tailwind" src="https://img.shields.io/badge/Tailwind-v4-38BDF8?style=for-the-badge&logo=tailwindcss&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img alt="Prisma" src="https://img.shields.io/badge/Prisma-Postgres-2D3748?style=for-the-badge&logo=prisma&logoColor=white" />
</p>

---

## The idea

Most money apps live on someone else's cloud, with someone else's ads. This one lives on **your desk**.

You create a username. You pick a currency and what you actually earn. Then you log what comes in and what goes out — no invented transactions, no “sample month” that pretends to be you. Accounts, leftover money, and a monthly grocery list sit in the same login.

Same username, same password, same numbers — Chrome, Edge, another computer — as long as they hit this app.

Built for one person who wants the books and the kitchen in one quiet place. Not a bank. Not a budget influencer dashboard.

**Live:** [shree-s-vault.vercel.app](https://shree-s-vault.vercel.app)

---

## Features

| | |
| --- | --- |
| **Your account** | Username + password. One name for the whole desk. Light and dark. |
| **Desk** | Available money, accounts at a glance, leftover vs your goal, this month’s picture |
| **Ledger** | Income, spend, envelopes, search, payees, CSV in and out |
| **Accounts** | Everyday and savings, opening balances, statements, move money between them |
| **Household bills** | Rent, light, water, internet — you type the figures |
| **Grocery** | Monthly items and prices — milk, rice, soap — tick when bought |
| **Yours only** | Your ledger is not mixed with anyone else’s. Live data sits in your Neon database |

---

## Quick start

```bash
git clone https://github.com/Shreesoni520/Shree-s-Vault.git
cd Shree-s-Vault
npm install
npx prisma generate
npx prisma db push
npm run dev
```

Copy `.env.example` to `.env`, then paste the Postgres URL from Vercel (Neon) and a long `SESSION_SECRET`:

```env
DATABASE_URL="postgresql://..."
DATABASE_URL_UNPOOLED="postgresql://..."
SESSION_SECRET="use-a-long-random-string"
```

On this machine, `npx vercel env pull` fills those from the Vercel project.

Open [http://localhost:3000](http://localhost:3000), create a username, pick a currency, and start the desk.

On Windows you can also double-click `start-server.bat`.

| Script | What it does |
| --- | --- |
| `npm run dev` | Local development |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npx prisma db push` | Create / update the Postgres tables |
| `npm run lint` | ESLint |

---

## How it works

```
Sign up  →  currency, pay, leftover goal
                │
                ├─ Desk: available, accounts, month
                ├─ Ledger: income, spend, envelopes, CSV
                ├─ Accounts: everyday, savings, transfers
                └─ Grocery: monthly items and prices
```

- **Auth** is username + password with a signed cookie session. Passwords are salted hashes. A username can only be taken once.
- **Money** is stored in cents. You pick the currency. Nothing is invented for you after onboarding.
- **Data** lives in Postgres through Prisma (`prisma/schema.prisma`). On Vercel that is a Neon database, so every device hitting the live site shares the same accounts.
- **Themes** follow the system or the toggle. The mark stays the same S; the circle flips with light / dark.

```text
Shree-s-Vault/
├── prisma/schema.prisma
├── public/                 # mark, favicons
├── src/app/                # pages + API
├── src/components/desk/    # Desk, Ledger, Accounts, Grocery, Settings
└── src/lib/                # money, auth, sessions
```

---

## Stack

- [Next.js 16](https://nextjs.org) App Router + Turbopack
- [React 19](https://react.dev) + TypeScript
- [Tailwind CSS v4](https://tailwindcss.com)
- [Prisma](https://www.prisma.io) 6 + Postgres (Neon on Vercel)
- [Base UI](https://base-ui.com)
- [Recharts](https://recharts.org) for the desk
- [Lucide](https://lucide.dev) icons
- [next-themes](https://github.com/pacocoursey/next-themes)

Need Node.js 20+. This is not a PHP app.

The live site on Vercel uses Neon Postgres and a `SESSION_SECRET` set in the project environment. Do not commit `.env`.

---

## Also by Shree

| Project | What it is | Link |
| --- | --- | --- |
| **Playlist** | Personal music room — YouTube tracks & playlists | [github.com/Shreesoni520/MyPlaylist](https://github.com/Shreesoni520/MyPlaylist) |
| **Extract** | Private file sharing with timed access | [github.com/Shreesoni520/Extract](https://github.com/Shreesoni520/Extract) |
| **Portfolio** | Personal site — dark room, ice-blue, motion | [github.com/Shreesoni520/MyPortfolio](https://github.com/Shreesoni520/MyPortfolio) |

---

## Author

**Krishna Soni**

- **GitHub:** [Shreesoni520](https://github.com/Shreesoni520)
- **Email:** [shreesoni520@gmail.com](mailto:shreesoni520@gmail.com)

---

## License

Private finance desk. Built by **Krishna Soni**.

Your numbers stay on your machine unless you deploy it. Please don’t ship this as your own product.
