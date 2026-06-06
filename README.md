# Nadbooks Backend

API for the Nadbooks platform — a marketplace where authors upload books and users buy them with a wallet funded by fiat (Paystack) or crypto (Monad). Built with **NestJS + Prisma (MySQL) + Redis + BullMQ**, run with **Bun**.

---

## Table of contents

- [Tech stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
  - [Core / app](#core--app)
  - [Database & cache](#database--cache)
  - [Auth & JWT](#auth--jwt)
  - [Super-admin seed](#super-admin-seed)
  - [File storage (Cloudflare R2)](#file-storage-cloudflare-r2)
  - [File storage (Dropbox — legacy fallback)](#file-storage-dropbox--legacy-fallback)
  - [Email (Resend)](#email-resend)
  - [Google OAuth](#google-oauth)
  - [Payments (Paystack)](#payments-paystack)
  - [Pricing & blockchain](#pricing--blockchain)
- [Provider setup guides](#provider-setup-guides)
- [Running & scripts](#running--scripts)
- [API documentation](#api-documentation)

---

## Tech stack

- **Runtime:** Bun
- **Framework:** NestJS 11
- **ORM:** Prisma 6 (MySQL)
- **Cache / queues:** Redis (ioredis) + BullMQ (email + webhook workers)
- **Storage:** Cloudflare R2 (S3-compatible), with Dropbox kept as a fallback provider
- **Upload safety:** magic-byte content-type detection + `sharp` image processing
- **Auth:** JWT access tokens + Redis-backed rotating refresh tokens, Google OAuth, Argon2 hashing
- **Email:** Resend
- **Rate limiting:** `@nestjs/throttler` with a Redis store

## Prerequisites

- [Bun](https://bun.sh) ≥ 1.0
- A **MySQL** database
- A **Redis** instance
- Accounts for the third-party services you intend to use (see [provider setup guides](#provider-setup-guides))

## Quick start

```bash
# 1. Install dependencies
bun install

# 2. Create your env file and fill it in (see Environment variables below)
cp .env.example .env

# 3. Generate the Prisma client and apply migrations
bun prisma generate
bun prisma migrate deploy   # or: bun prisma migrate dev  (for local development)

# 4. Run
bun run start:dev           # watch mode
```

The API is served under the `/api` prefix (e.g. `http://localhost:3000/api`).

> **Note on Prisma + env:** this project uses `prisma.config.ts`, which makes the Prisma CLI **skip automatic `.env` loading**. If `bun prisma ...` reports `Environment variable not found: DATABASE_URL`, export it for the command, e.g. `DATABASE_URL="mysql://..." bun prisma migrate dev`.

---

## Environment variables

Copy `.env.example` to `.env` and fill in the values. Every variable is described below.

### Core / app

| Variable | Required | Example | Description |
| --- | --- | --- | --- |
| `NODE_ENV` | yes | `development` | `development` or `production`. In production, JWT expiry is always enforced and CORS is restricted to `FRONTEND_ORIGIN_PREFIX`. In development, verification/PIN codes are forced to `000000` and emails are not actually sent. |
| `PORT` | yes | `3000` | Port the HTTP server listens on. |
| `FRONTEND_ORIGIN_PREFIX` | yes | `https://app.nadbooks.com` | Comma-separated allowed CORS origins (used in production). |

### Database & cache

| Variable | Required | Example | Description |
| --- | --- | --- | --- |
| `DATABASE_URL` | yes | `mysql://user:pass@localhost:3306/nadbooks` | MySQL connection string used by Prisma. |
| `REDIS_URL` | yes | `redis://localhost:6379` | Redis connection. Backs refresh tokens, verification codes, the price cache, BullMQ queues, and the rate-limiter store. |
| `CACHE_TTL` | yes | `900` | Default cache TTL (seconds) for cached reads such as book listings. |

### Auth & JWT

| Variable | Required | Example | Description |
| --- | --- | --- | --- |
| `JWT_SECRET` | yes | *(random string)* | Secret used to sign access tokens. Generate a strong one: `openssl rand -base64 48`. |
| `JWT_EXPIRES_IN` | yes | `15m` | Access-token lifetime. |
| `IGNORE_JWT_EXPIRATION` | yes | `false` | Dev-only convenience to accept expired tokens. **Automatically ignored when `NODE_ENV=production`** (expiry is always enforced). |
| `REFRESH_TOKEN_TTL` | yes | `604800` | Refresh-token lifetime in seconds (e.g. 7 days). |
| `VERIFICATION_CODE_TTL` | yes | `600` | Lifetime (seconds) of email-verification / PIN-reset / email-change codes. |

### Super-admin seed

Used to bootstrap the first SUPER_ADMIN account.

| Variable | Required | Description |
| --- | --- | --- |
| `SUPER_ADMIN_EMAIL` | yes | Super-admin email. |
| `SUPER_ADMIN_USERNAME` | yes | Super-admin username. |
| `SUPER_ADMIN_FIRSTNAME` | yes | First name. |
| `SUPER_ADMIN_LASTNAME` | yes | Last name. |
| `SUPER_ADMIN_PASSWORD` | yes | Initial password — change it after first login. |

### File storage (Cloudflare R2)

`STORAGE_PROVIDER=r2` (default). Books go to a **private** bucket and are served via short-lived presigned URLs; covers and avatars go to a **public** bucket. See the [Cloudflare R2 setup guide](#cloudflare-r2).

| Variable | Required | Example | Description |
| --- | --- | --- | --- |
| `STORAGE_PROVIDER` | yes | `r2` | `r2` (default) or `dropbox`. |
| `R2_ACCOUNT_ID` | yes (r2) | `a1b2c3...` | Cloudflare account ID; the S3 endpoint is derived from it. |
| `R2_ACCESS_KEY_ID` | yes (r2) | | R2 API token access key ID. |
| `R2_SECRET_ACCESS_KEY` | yes (r2) | | R2 API token secret. |
| `R2_BUCKET` | yes (r2) | `nadbooks-private` | **Private** bucket for book files. |
| `R2_PUBLIC_BUCKET` | no | `nadbooks-public` | **Public** bucket for covers/avatars. Falls back to `R2_BUCKET` if unset. |
| `R2_PUBLIC_BASE_URL` | yes (r2) | `https://cdn.nadbooks.com` | Public domain bound to `R2_PUBLIC_BUCKET` (no trailing slash). |
| `DOWNLOAD_URL_TTL` | no | `300` | Seconds a presigned book-download link stays valid. |

### File storage (Dropbox — legacy fallback)

Only needed if `STORAGE_PROVIDER=dropbox`. Kept for backward compatibility; R2 is the recommended provider.

| Variable | Description |
| --- | --- |
| `DROPBOX_APP_KEY` / `DROPBOX_APP_SECRET` | App credentials from the Dropbox developer console. |
| `DROPBOX_REFRESH_TOKEN` | Long-lived refresh token used to mint access tokens. |
| `DROPBOX_ACCESS_TOKEN` | Access token (short-lived). |
| `DROPBOX_AUTH_CODE` / `DROPBOX_REDIRECT_URI` | OAuth authorization code + redirect URI used to obtain the refresh token. |

### Email (Resend)

| Variable | Required | Example | Description |
| --- | --- | --- | --- |
| `RESEND_API_KEY` | yes* | `re_...` | Resend API key. *If missing, emails are silently dropped (handy for local dev).* |
| `EMAIL_FROM` | yes | `noreply@nadbooks.com` | Verified sender address. |

### Google OAuth

| Variable | Required | Description |
| --- | --- | --- |
| `GOOGLE_CLIENT_ID` | yes* | OAuth client ID (also used to verify Google ID tokens on `/auth/google`). |
| `GOOGLE_CLIENT_SECRET` | yes* | OAuth client secret. |
| `GOOGLE_CALLBACK_URL` | yes* | Redirect URI registered with Google, e.g. `http://localhost:3000/api/auth/google/callback`. |

\* Required only if you enable Google sign-in.

### Payments (Paystack)

| Variable | Required | Description |
| --- | --- | --- |
| `PAYSTACK_SECRET` | yes* | Paystack secret key — used for fiat deposits, withdrawals, and webhook signature verification. *Required for the fiat payment flow.* |

### Pricing & blockchain

Used by the price feed (NGN/USD + on-chain MON/BOOKS rates) and the crypto deposit/withdrawal flows.

| Variable | Required | Example | Description |
| --- | --- | --- | --- |
| `CURRENCYFREAK_SECRET` | yes | | API key for [CurrencyFreaks](https://currencyfreaks.com) (USD→NGN rate). **Quota: 1000 calls/month** on the free plan. |
| `FIAT_REFRESH_INTERVAL_MS` | no | `3600000` | How often to refresh the USD/NGN rate. Default hourly (~744/month). Keep it high enough to stay under your CurrencyFreaks quota. |
| `ALCHEMY_RPC_URL` | yes* | | RPC endpoint used to read on-chain DEX prices and send crypto transactions. |
| `ALCHEMY_SECRET` | no | | Alchemy API secret, if used. |
| `CENTRAL_WALLET_ADDRESS` | yes* | | Platform hot-wallet address that receives crypto deposits. |
| `CENTRAL_WALLET_PRIVATE_KEY` | yes* | | Private key for the central wallet. **Keep this secret.** |
| `SMART_CONTRACT_ADDRESS` | yes* | | Address of the platform smart contract. |
| `BOOKS_ADDRESS` | no | | BOOKS token contract address (for the on-chain BOOKS/USDT price). |
| `BOOKS_USDT_POOL_ADDRESS` | no | | BOOKS/USDT DEX pool address. |
| `MOBULA_SECRET` | no | | Mobula API key (alternative crypto price data source). |

\* Required only for the crypto payment flow.

> **Mock prices:** the fallback MON/USDT (`1.5`) and BOOKS/USDT (`0.00073`) prices used before the DEX pools are live are now **constants in code** (`src/price-feed/providers/dex-price.provider.ts`), not env vars. Once the on-chain pools are wired up, those fallback branches stop being hit.

---

## Provider setup guides

### Cloudflare R2

1. **Create buckets** (R2 → *Create bucket*): one **private** (`R2_BUCKET`, for books — leave public access off) and one **public** (`R2_PUBLIC_BUCKET`, for covers/avatars).
2. **Account ID:** shown on the R2 overview as part of the S3 endpoint `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` → `R2_ACCOUNT_ID`.
3. **API token:** R2 → *Manage R2 API Tokens* → *Create API token* with **Object Read & Write**. Copy the **Access Key ID** (`R2_ACCESS_KEY_ID`) and **Secret Access Key** (`R2_SECRET_ACCESS_KEY`).
4. **Public access:** on the public bucket, enable the **r2.dev** subdomain (dev) or attach a **custom domain** (prod, recommended). That URL is `R2_PUBLIC_BASE_URL` (no trailing slash).
5. **CORS:** if your frontend fetches objects via JS, add a CORS rule allowing `GET` from your frontend origin (on the public bucket, and on the private bucket if you `fetch()` presigned links rather than navigating to them).

### Google OAuth

1. [Google Cloud Console](https://console.cloud.google.com) → *APIs & Services* → *Credentials* → *Create OAuth client ID* (Web application).
2. Add your redirect URI (`GOOGLE_CALLBACK_URL`) to *Authorized redirect URIs*.
3. Copy the **Client ID** and **Client secret**.

### Resend

1. [Resend dashboard](https://resend.com) → *API Keys* → create a key → `RESEND_API_KEY`.
2. Verify a sending domain/address and set it as `EMAIL_FROM`.

### Paystack

1. [Paystack dashboard](https://dashboard.paystack.com) → *Settings* → *API Keys & Webhooks*.
2. Copy the **Secret Key** → `PAYSTACK_SECRET`. Configure your webhook URL there to point at the backend's webhook endpoint.

### CurrencyFreaks

1. Sign up at [currencyfreaks.com](https://currencyfreaks.com) → copy the API key → `CURRENCYFREAK_SECRET`.
2. The free plan allows **1000 requests/month**; the backend refreshes USD/NGN hourly and caches it in Redis, so all conversions read from cache.

### Alchemy (or any RPC)

1. [Alchemy dashboard](https://dashboard.alchemy.com) → create an app on the target network → copy the **HTTPS RPC URL** → `ALCHEMY_RPC_URL`.

### MySQL & Redis

- **MySQL:** any MySQL 8 instance; set `DATABASE_URL`. Run `bun prisma migrate deploy` to create tables.
- **Redis:** any Redis instance; set `REDIS_URL`.

---

## Running & scripts

```bash
bun run start          # start
bun run start:dev      # watch mode
bun run start:prod     # run compiled build (node dist/main)
bun run build          # compile
bun run lint           # eslint --fix
bun run test           # unit tests
bun run test:e2e       # e2e tests
```

## API documentation

- **Swagger UI** is generated from the controllers (NestJS Swagger) — browse it at the configured docs path when the server is running.
- **Yaak collection:** `yaak.nadbooks-backend-api.json` in the repo root can be imported into [Yaak](https://yaak.app) for a ready-made request collection covering every endpoint.

---

## Planned changes

### TODO: migrate the database from MySQL to PostgreSQL

The switch itself is mostly mechanical (`provider = "postgresql"` in `schema.prisma`, a Postgres `DATABASE_URL`, and re-initialised migrations). The one behavioural difference to handle in code:

- **Case sensitivity.** MySQL string comparisons are case-insensitive by default; **Postgres is case-sensitive.** Before/at the switch:
  - Normalise emails to lowercase on store **and** lookup (`register`, `login`, OAuth) so `John@x.com` and `john@x.com` resolve to the same user.
  - Add `mode: 'insensitive'` to `contains` filters (e.g. the admin user search) to keep search case-insensitive.

Nothing else in the codebase is MySQL-specific (`Json` → `jsonb`, enums, `Decimal`, and `autoincrement` all map cleanly).
