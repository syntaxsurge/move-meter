After you finish each task, please provide a one-line GitHub commit message that I can use to manually commit the changes you made. Keep the message focused only on your changes from my latest prompt and your response, since I’ll be working on this repository with multiple AI agents. When creating the commit message, don’t rely on git diff or porcelain commands; instead, rely on my latest prompt and your latest response to create the best commit message.

# Agent Playbook (Living Document)

This file is the authoritative reference for platform architecture and agent expectations. It must always describe the current, production-ready state of the system—never legacy behavior. Update this file alongside any material feature change. Only capture structural, user-visible, or integration-impacting details; omit trivia. When we remove/replace something, like a feature, I DO NOT want you to document the removal or replacement here, but instead, if that feature is documented here currently, I want you to just remove it if we done removal and replace it with teh new feature if we did replacement. The reason is that I only want to support latest versions of my application here without documenting the previous iterations, this file should serve as the current machination explanation of my codebase and not for changelogs. If any previous version explanation is present here, then it should be removed. Do not also imply that we just implemented a certain feature here, by using words like "we now have this X feature" since I only want to imply that the features we have iin our application was in here already initially, without any implications of the new changes we made.

## Documentation Expectations

- Update this document whenever routes, flows, data contracts, or integration requirements change.
- Describe the latest behavior succinctly; avoid references to prior implementations.
- Skip minor cosmetic tweaks—limit entries to structural or behavioral updates that affect future engineering work.

## Engineering Principles

1. **Import cleanly, delete legacy.** Never add re‑exports or preserve legacy APIs. Always import from canonical sources and remove unused branches, empty blocks, or deprecated files during every change.

2. **Extend before you create.** Before writing new functions, components, or libraries, analyze existing ones in `src/lib`, shared UI, and feature modules. Check related files for possible extension points—props, return types, or configuration options. Prefer enhancing them by adding parameters or return variants rather than duplicating logic. Only build something new when there’s *no existing code* that can be extended without harm.

3. **Simplify through reuse.** If you or the AI analysis discover that a piece of code can be simplified by calling an existing component, function, or library instead of re‑implementing logic, refactor it. Merge redundant utilities or components when their behavior overlaps and eliminate unnecessary abstractions. The codebase should always converge toward fewer, more capable building blocks.

4. **Be minimal and accessible.** All new pages and components should follow the modern, minimal UI style—clean, responsive, and accessible (ARIA labels, focus states, keyboard navigation, color contrast). Avoid over‑engineering or speculative flexibility.

5. **Type‑sound and consistent.** Run `pnpm typecheck` before merging. Maintain consistent naming, small API surfaces, and clear defaults. Remove unused files and ensure new or extended helpers live in canonical locations to encourage immediate reuse.

### Examples

* Instead of creating `formatDate2`, extend `formatDate` with `options: { locale?: string; format?: string }`.
* Replace custom loaders with an existing `Spinner` component configured via props rather than duplicating markup.
* If two button variants differ only in color and spacing, merge them into one component with configurable variants.
* When adding a new fetch utility, inspect existing APIs—if a related `fetchData` exists, add optional parameters or expand return types instead of building another function.

### Guiding Mindset

Analyze → Extend → Simplify → Delete. Every change should either improve clarity, reduce duplication, or enable reuse. Only create new code when absolutely necessary and back it with clear reasoning in the PR description.

# Next.js 15 App Router Project Structure Guide

You are an AI coding assistant that builds **production-grade, scalable Next.js 15 App Router** applications.

When creating or editing a project, assume this blueprint as the default unless explicitly told otherwise:

- Use **Next.js 15** with the **App Router** under `src/app`.
- Use **TypeScript** everywhere (`.ts`, `.tsx`).
- Use a **`src/`-based layout**: application code under `src`, configuration at the project root.
- Treat components in `app/` as **Server Components by default**; add `"use client"` only when necessary.
- Use **`middleware.ts`** at `src/middleware.ts` to run logic before a request is completed (auth, redirects, rewrites, logging).
- Manage environment variables with **workspace-scoped `.env` files**:
  - Root `.env.local` / `.env.*` for the Next.js app and cross-cutting services.
  - `blockchain/.env` for on-chain tooling (Hardhat/Foundry), with `blockchain/.env.example` as a template.
- Support **at most one off-chain backend stack per project** (or none):
  - **Supabase + Drizzle/Postgres** (SQL stack), or  
  - **Convex** (managed backend stack).
- Optionally support a **blockchain workspace** under `blockchain/`:
  - **Hardhat** *or* **Foundry** as the primary smart-contract tool (choose at most one by default),
  - A shared `blockchain/contracts/` folder as the canonical Solidity source of truth,
  - Optional frontend integration in `src/lib/contracts/`.
- Keep **caching explicit** in Next.js 15:
  - `GET` Route Handlers are **not cached by default**.
  - `fetch` is **`no-store` by default** in many server contexts.
  - Opt into caching via route segment config (`dynamic`, `revalidate`, etc.) and `fetch` options.
  - Centralize caching decisions in a small number of modules instead of scattering them.

Everything below defines **where to place each file**, **what belongs in each folder**, and **how to avoid redundant files**.

---

## 1. Target Project Tree (Baseline Template)

Use this as the **default template**. Extend or trim as needed. Folders marked `# OPTIONAL` are add-ons.

~~~txt
.
├─ public/
│  ├─ favicon.ico
│  ├─ icons/
│  ├─ images/
│  └─ manifest.webmanifest
├─ blockchain/                   # OPTIONAL: smart-contract workspace (only if using blockchain)
│  ├─ .env.example               # Template for blockchain/.env (Hardhat/Foundry secrets)
│  ├─ contracts/                 # Shared Solidity contracts (source of truth)
│  ├─ hardhat/                   # OPTIONAL: choose Hardhat OR Foundry (not both by default)
│  │  ├─ hardhat.config.ts
│  │  ├─ package.json
│  │  ├─ scripts/
│  │  ├─ test/
│  │  ├─ ignition/               # OPTIONAL: Hardhat Ignition modules
│  │  ├─ artifacts/              # generated (usually gitignored)
│  │  └─ cache/                  # generated (usually gitignored)
│  └─ foundry/                   # OPTIONAL: choose Foundry OR Hardhat (not both by default)
│     ├─ foundry.toml
│     ├─ script/
│     ├─ test/
│     ├─ lib/
│     ├─ out/                    # generated (build output, often gitignored)
│     └─ cache/                  # generated (often gitignored)
├─ drizzle/                      # OPTIONAL: Drizzle SQL migrations output
├─ supabase/                     # OPTIONAL: Supabase CLI config + SQL migrations
│  ├─ config.toml
│  └─ migrations/
├─ convex/                       # OPTIONAL: Convex backend (schema + functions)
│  ├─ schema.ts
│  ├─ functions/
│  └─ auth/
├─ scripts/                      # One-off CLIs and dev helpers
│  ├─ convex-dev.cjs             # Starts Convex dev server
│  ├─ disable-sentry.cjs         # Disables Sentry for local/dev builds
│  └─ reset-convex.ts            # Resets Convex tables via admin mutation
├─ infra/                        # IaC: Terraform/Pulumi/Docker/etc.
├─ docs/                         # Architecture docs, ADRs, runbooks
├─ e2e/                          # Playwright/Cypress tests
├─ .github/
│  └─ workflows/                 # CI/CD pipelines
├─ .gitignore                    # Git ignore rules
├─ package.json
├─ next.config.js                # Next.js config
├─ tsconfig.json                 # TypeScript config
├─ postcss.config.js             # PostCSS/Tailwind pipeline
├─ tailwind.config.ts            # Tailwind theme (if used)
├─ .eslintrc.json                # ESLint config
├─ .env.example                  # Documented root env variables (Next.js + services)
├─ next-env.d.ts                 # Generated by Next
└─ src/
   ├─ app/
   │  ├─ (marketing)/            # Marketing / public routes
   │  │  ├─ layout.tsx
   │  │  ├─ page.tsx
   │  │  └─ ...
   │  ├─ (app)/                  # Authenticated workspace routes
   │  │  ├─ layout.tsx
   │  │  ├─ dashboard/
   │  │  │  ├─ page.tsx
   │  │  │  └─ components/
   │  │  └─ settings/
   │  │     ├─ page.tsx
   │  │     └─ components/
   │  ├─ (auth)/                 # Sign-in / sign-up / reset flows
   │  │  ├─ layout.tsx
   │  │  ├─ sign-in/
   │  │  │  └─ page.tsx
   │  │  └─ sign-up/
   │  │     └─ page.tsx
   │  ├─ api/                    # Route Handlers (server-only endpoints)
   │  │  ├─ auth/
   │  │  │  └─ route.ts
   │  │  ├─ webhooks/
   │  │  │  └─ route.ts
   │  │  └─ health/
   │  │     └─ route.ts
   │  ├─ layout.tsx              # Root layout (wraps entire app)
   │  ├─ page.tsx                # "/" route (usually marketing home)
   │  ├─ loading.tsx             # Root loading UI
   │  ├─ error.tsx               # Root segment error boundary
   │  ├─ global-error.tsx        # Global error boundary
   │  ├─ not-found.tsx           # 404 for App Router
   │  ├─ sitemap.ts              # Dynamic sitemap
   │  └─ robots.ts               # Dynamic robots.txt
   ├─ components/                # Cross-route, reusable UI
   │  ├─ ui/                     # Design-system primitives (Button, Input, Dialog)
   │  ├─ layout/                 # Shells, navbars, sidebars, footers
   │  ├─ data-display/           # Charts, tables, cards, lists
   │  ├─ feedback/               # Toasts, alerts, skeletons, spinners
   │  └─ form/                   # Reusable form controls & wrappers
   ├─ features/                  # Vertical domain slices
   │  └─ <feature>/
   │     ├─ components/          # Feature-specific UI (forms, panels, modals)
   │     ├─ hooks/               # Feature hooks
   │     ├─ services/            # Feature data access & orchestration
   │     ├─ state/               # Feature-level stores
   │     ├─ types/               # Feature-only types
   │     └─ tests/               # Feature tests (if not colocated)
   ├─ hooks/                     # Shared hooks reusable across features/routes
   ├─ lib/                       # Framework-agnostic helpers & integrations
   │  ├─ api/                    # Fetch clients, server actions, API SDKs
   │  ├─ auth/                   # Auth/session helpers, guards
   │  ├─ cache/                  # Caching helpers, cache tags
   │  ├─ config/                 # Runtime config builders/constants
   │  ├─ db/                     # Database layer (choose one stack per project)
   │  │  ├─ drizzle/             # Drizzle ORM (if used)
   │  │  │  ├─ schema/           # Drizzle tables & relations
   │  │  │  ├─ client.ts         # Drizzle client factory (server-only)
   │  │  │  └─ migrations.ts     # Helpers for migrations
   │  │  ├─ supabase/            # Supabase client adapters
   │  │  │  ├─ client-server.ts  # SSR/server Supabase client
   │  │  │  ├─ client-browser.ts # Browser Supabase client
   │  │  │  └─ types.ts          # Generated Supabase types
   │  │  └─ convex/              # Convex client adapter (if used)
   │  │     └─ client.ts
   │  ├─ contracts/              # OPTIONAL: frontend smart-contract integration
   │  │  ├─ abi/                 # ABI JSON files imported by the frontend
   │  │  ├─ clients/             # Typed contract clients (viem/wagmi/ethers)
   │  │  └─ addresses.ts         # Chain → contract address mapping
   │  ├─ env/                    # Zod-validated environment variables
   │  ├─ observability/          # Logging, tracing, metrics
   │  ├─ queue/                  # Background job clients
   │  ├─ security/               # Crypto, permissions, rate limiting
   │  ├─ storage/                # File/object storage adapters
   │  ├─ utils/                  # Pure helpers (dates, formatting, ids)
   │  └─ validation/             # Zod/Yup schemas used across app
   ├─ services/                  # Cross-cutting service clients (email, payments)
   ├─ state/                     # Global app-level stores (rare)
   ├─ types/
   │  ├─ domain/                 # Domain model types shared across features
   │  ├─ api/                    # DTOs and API contracts
   │  └─ global.d.ts             # Global type declarations, module shims
   ├─ styles/
   │  ├─ globals.css             # Imported once in app/layout.tsx
   │  ├─ tailwind.css            # Tailwind entry (if applicable)
   │  └─ tokens.css              # CSS tokens (or tokens.ts)
   ├─ content/
   │  ├─ mdx/                    # MD/MDX content (blog, docs, marketing)
   │  └─ locales/                # i18n translation files
   ├─ assets/
   │  ├─ images/                 # Importable images (non-direct URL)
   │  ├─ icons/                  # SVGs, icon sprites
   │  └─ fonts/                  # Self-hosted fonts
   ├─ mocks/
   │  ├─ msw/                    # MSW handlers for dev/tests
   │  ├─ data/                   # Fixture data / factories
   │  └─ handlers.ts             # MSW setup
   ├─ tests/
   │  ├─ setup/                  # Jest/Vitest/Playwright setup
   │  └─ utils/                  # Shared test helpers
   ├─ workers/
   │  ├─ edge/                   # Edge-specific workers/helpers
   │  └─ queue/                  # Background job processors
   ├─ middleware.ts              # Next.js Middleware (runs before routes)
   ├─ instrumentation.ts         # Server-side instrumentation
   └─ instrumentation-client.ts  # Client-side instrumentation
~~~

---

## 2. Placement Rules for New Files and Folders

When adding or modifying code, follow these steps.

### 2.1 Determine the correct layer

1. **Route UI**  
   → `src/app/**`
2. **Shared UI** (reused across routes/features)  
   → `src/components/**`
3. **Feature-specific UI or domain logic**  
   → `src/features/<feature>/**`
4. **Hook**  
   - Feature-specific → `src/features/<feature>/hooks`  
   - Cross-cutting → `src/hooks`
5. **Data access / env / caching / auth / contracts / utilities**  
   - Cross-cutting infra → `src/lib/**`  
   - Domain workflow → `src/features/<feature>/services`
6. **Vendor service client** (payments, email, analytics)  
   → `src/services/**`
7. **Global app state**  
   → `src/state/**` (only if truly global)
8. **Smart-contract code/tooling**  
   - Solidity contracts → `blockchain/contracts`  
   - Hardhat files → `blockchain/hardhat/**`  
   - Foundry files → `blockchain/foundry/**`  
   - Frontend ABIs/addresses/clients → `src/lib/contracts/**`
9. **Environment configuration**  
   - Next.js app + services → root `.env.*` + `src/lib/env/**`  
   - Blockchain tooling → `blockchain/.env` (template: `blockchain/.env.example`)

### 2.2 Prefer extending existing modules over creating new ones

Before creating a new helper or service file:

1. Search existing modules:
   - `src/lib/utils`
   - `src/lib/api`
   - `src/lib/env`
   - `src/lib/db`
   - `src/lib/contracts`
   - `src/features/<feature>/services`
2. If similar behavior exists:
   - Extend the existing module:
     - Add a new function or overload.
     - Add options/parameters.
     - Add code paths that preserve existing behavior by default.
3. Only create new files when:
   - Responsibility is clearly distinct.
   - Extending existing modules would reduce clarity.

### 2.3 Server vs client boundaries

- Do **not** import:
  - `src/lib/db/**`,
  - `src/lib/env/**`,
  - `blockchain/**`  
  in client-only components or hooks.
- Client components may:
  - Call server actions in `src/lib/api`.
  - Use browser-safe clients like `src/lib/db/supabase/client-browser.ts` or contract clients designed for the browser.
- Secrets, DB access, and low-level contract deployment logic must stay in:
  - Server Components.
  - Route handlers.
  - Server actions.
  - Scripts.
  - Feature services invoked from server contexts.

### 2.4 Routing-specific decisions

- Use route groups `(marketing)`, `(app)`, `(auth)` to organize sections.
- Use dynamic segments `[id]` for resource-specific pages.
- Introduce additional route groups as needed (`(admin)`, `(studio)`, etc.).
- Keep URLs stable; refactor internals via groups and feature refactors rather than URL churn.

### 2.5 Caching and performance (Next.js 15)

- Centralize expensive logic in:
  - `src/lib/cache`, `src/lib/db`, or feature services.
- Remember:
  - `GET` Route Handlers are uncached by default.
  - `fetch` defaults to no-store in many server scenarios.
- Opt into caching explicitly using:
  - Route config (`dynamic`, `revalidate`).
  - `fetch` options.
- Avoid copy-pasting caching logic; prefer shared helpers.

### 2.6 Database and services

- For Drizzle+Supabase:
  - Tables and relations in `src/lib/db/drizzle/schema`.
  - Supabase clients in `src/lib/db/supabase`.
  - Domain-specific queries in feature services or DB helper modules.
- For Convex:
  - Schema and functions under `convex/`.
  - Client helpers under `src/lib/db/convex/client.ts`.

Select **one** backend stack (Drizzle+Supabase or Convex) per project by default.

### 2.7 Blockchain workspace (if present)

- Keep all Solidity in `blockchain/contracts`.
- Configure Hardhat/Foundry to read from this shared source directory.
- Use `scripts/` to compile/deploy contracts and keep frontend ABIs/addresses in sync when a blockchain workspace is added.
- Never import from `blockchain/**` in the Next.js runtime; rely on `src/lib/contracts/**`.


**KEEP THE HEADINGS CONTENTS BELOW UPDATED:**


# Platform Summary

MoveMeter is a Next.js 15 App Router app that uses Privy for authentication and Movement wallet provisioning, Convex as the backend data layer for marketplace listings, receipts, shareable portfolio reports, and usage analytics, Movement Indexer GraphQL for portfolio data, and x402 to enforce pay-per-request access to paid API routes.

Environment variables are validated via Zod:
- Public: `NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_PRIVY_APP_ID` (25 chars)
- Server (Next.js): `MOVEMENT_NETWORK`, `MOVEMENT_CHAIN_ID`, `MOVEMENT_FULLNODE_URL`, `MOVEMENT_INDEXER_URL`, `MOVEMENT_FAUCET_URL`, `MOVEMENT_EXPLORER_URL`, `MOVEMENT_BASE_COIN_TYPE`, `X402_MODE`, `X402_FACILITATOR_URL`, `X402_NETWORK`, `X402_PAY_TO_ADDRESS`, `X402_PRICE_USD`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- Server (Convex): `PRIVY_APP_ID`, `PRIVY_APP_SECRET`

## Core Commands

- `pnpm dev` – run the Next.js dev server
- `pnpm convex:dev` – run Convex dev (provisions a dev deployment and writes `.env.local`)
- `pnpm typecheck` – run TypeScript typechecking
- `pnpm lint` – run ESLint
- `pnpm build` / `pnpm start` – production build and start

## Route Inventory

- `/` – marketing home
- `/demo` – judge-friendly demo flow + links
- `/sign-in` – Privy sign-in and Movement wallet provisioning
- `/marketplace` – public listings marketplace
- `/marketplace/[slug]` – listing details with Try Console
- `/app/dashboard` – authenticated dashboard
- `/app/dashboard/analytics` – authenticated paid-call analytics dashboard
- `/app/meter-report` – authenticated x402 pay-per-request tools UI (meter report + MOVE balance lookup)
- `/app/portfolio` – authenticated portfolio report generator (x402 + share link)
- `/app/wallet` – authenticated wallet page
- `/app/dev/dashboard` – authenticated provider dashboard
- `/app/dev/new` – authenticated listing creation
- `/r/[slug]` – public share page for a saved portfolio report
- `/api/health` – health check for Movement RPC + Indexer reachability
- `/api/movement/balance?address=0x...` – returns Movement base coin balance for an address
- `/api/paid/meter-report` – x402-protected paid API returning Movement ledger snapshot
- `/api/paid/movement/move-balance?address=0x...` – x402-protected paid API returning MOVE balance for an address
- `/api/paid/movement/portfolio` – x402-protected paid API returning a Movement portfolio report (POST JSON body)

## Architecture Overview

- `src/app/layout.tsx` loads global styles and mounts `src/app/providers.tsx`.
- `src/app/providers.tsx` wraps the app with `PrivyProvider` and `ConvexProvider` using `src/lib/env/client.ts`, and mounts `src/components/auth/SyncConvexUser.tsx` to upsert the authenticated user into Convex.
- Authenticated routes live under `src/app/(app)/app/**` and are protected by `src/components/auth/AuthGate.tsx` (redirects to `/sign-in?next=...`).
- Movement wallet creation is enforced client-side by `src/components/auth/EnsureMovementWallet.tsx` using Privy extended chains (`useCreateWallet` with `chainType: "movement"`).
- Privy-authenticated users are upserted into the Convex `users` table via `convex/actions/users.ts` (identity token verification) + `convex/users.ts` (internal mutation); `movementAddress` is stored when available.
- On-chain Movement balance reads happen server-side in `src/app/api/movement/balance/route.ts` and `src/app/api/paid/movement/move-balance/route.ts` using `src/lib/movement/balance.ts` + `src/lib/movement/client.ts` (Aptos TS SDK).
- Movement portfolio reports are built server-side in `src/app/api/paid/movement/portfolio/route.ts` using `src/lib/movement/indexer.ts` (Movement Indexer GraphQL) and stored in Convex `portfolioReports` via `convex/portfolioReports.ts`.
- UI primitives live in `src/components/ui/**` and the wallet UX is implemented in `src/features/wallet/MovementWalletCard.tsx` (SWR polling + faucet link).
- Marketplace routes live in `src/app/(marketing)/marketplace/**` and are implemented in `src/features/listings/**` using Convex queries/actions.
- Frontend Convex function references live in `src/lib/convex/api.ts` (manual `makeFunctionReference` API, no `convex/_generated/**` dependency).
- x402 configuration is validated in `src/lib/env/x402.ts` and the resource server is initialized in `src/lib/x402/server.ts` (HTTP facilitator client + Exact EVM scheme registration).
- `src/middleware.ts` enforces x402 on `GET /api/paid/meter-report` using `paymentProxy` from `@x402/next`.
- Paid Movement endpoints are implemented in `src/app/api/paid/movement/**` using `withX402` from `@x402/next`.
- Paid x402 UI lives in `src/features/x402/**` (Privy `useX402Fetch` + Convex receipt storage) and is rendered on `src/app/(app)/app/meter-report/page.tsx`.
- Portfolio report UI lives in `src/features/x402/PaidPortfolioReportCard.tsx` and is rendered on `src/app/(app)/app/portfolio/page.tsx`; public share links render on `src/app/(marketing)/r/[slug]/page.tsx`.
- Usage analytics are recorded in Convex `usageEvents`/`usageDaily` (`convex/usageEvents.ts`) from paid route handlers via `src/lib/convex/http.ts` and rendered on `src/app/(app)/app/dashboard/analytics/page.tsx` (Recharts + `src/components/ui/chart.tsx`).
- Paid API rate limiting uses Upstash when configured (`src/lib/security/ratelimit.ts` + `src/lib/env/upstash.ts`).
- Provider listing creation and Try Console are implemented as Convex Node Actions in `convex/actions/listings.ts` (Privy identity token verification + SSRF-hardened fetch) and backed by `convex/listings.ts` + `convex/schema.ts`.
- Payment receipts are stored in `paymentReceipts` in `convex/schema.ts` and written/read via `convex/payments.ts`.
- `vercel.json` configures Vercel to deploy Convex before building Next.js (requires `CONVEX_DEPLOY_KEY` in Vercel).
- Privy identity tokens must be enabled in the Privy Dashboard for server-side verification to succeed.
- Convex Node Actions that verify Privy identity tokens require `PRIVY_APP_ID` and `PRIVY_APP_SECRET` to be set in the Convex deployment environment variables.
- Convex schema and functions live in `convex/**` and project settings live in `convex.json`.
