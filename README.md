# MoveMeter

MoveMeter is a Next.js 15 App Router app for pay-per-request tooling on Movement. It uses Privy for auth + Movement wallet provisioning, and Convex for marketplace listings, receipts, and analytics.

## Local development

1) Install dependencies: `pnpm i`

2) Create `.env.local`:
- Copy `.env.example` → `.env.local`
- Set `NEXT_PUBLIC_PRIVY_APP_ID`
- Run `pnpm convex:dev` to provision Convex and write `NEXT_PUBLIC_CONVEX_URL`

3) Start dev servers:
- `pnpm convex:dev`
- `pnpm dev`

## Commands

- `pnpm dev` – Next.js dev server
- `pnpm convex:dev` – Convex dev deployment
- `pnpm typecheck` – TypeScript typecheck
- `pnpm lint` – ESLint
- `pnpm build` / `pnpm start` – production build and start

## Key routes

- `/` – marketing home
- `/sign-in` – Privy sign-in + Movement wallet provisioning
- `/marketplace` – public marketplace
- `/app/wallet` – wallet + balance UI
