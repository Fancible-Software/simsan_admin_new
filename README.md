# Simsan Admin — Next.js

This is the unified Next.js replacement for the former Angular frontend and Express/TypeORM backend. The browser UI, authenticated API, PostgreSQL access, invoice/quote pages, reporting, and optional email delivery all run in one application.

## What was ported

- Secure login, logout, database-backed sessions, and one-time email verification
- Admin/sub-admin permissions
- Invoice and quote search, pagination, creation, editing, deletion, and quote-to-invoice conversion
- Public secure invoice and quote links with print and persisted PDF downloads
- Service catalogue, pricing, priority, activation, soft deletion, and restore
- User creation, verification, activation, and soft deletion
- Percentage and fixed-dollar discounts with original five-percent GST behavior
- Company/invoice configurations with PNG/JPEG upload support
- Dashboard totals and 30-day invoice activity view
- Date-range analytics and native two-sheet Excel export
- Rich invoice, quote, verification, and promotional emails with office copies
- Canadian province/city selection and public contact intake API

## Run locally

Node.js 22 or newer and PostgreSQL 14 or newer are recommended.

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open <http://localhost:3000>. The app creates missing tables and starter data on the first database-backed request. You can also initialize explicitly:

```bash
npm run db:setup
```

For a new, empty database the default login is `admin@simsanfrasermain.com` / `admin@123`. Set `DEFAULT_ADMIN_EMAIL` and `DEFAULT_ADMIN_PASSWORD` before first boot to choose safer bootstrap credentials. These values are ignored after the first user exists.

## Database variables

Use either `DATABASE_URL` or the individual variables below:

```dotenv
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=root
DB_NAME=postgres
DB_SCHEMA=public
DB_SSL=false
```

No JWT/auth secret is required. Login tokens are random, stored as SHA-256 hashes in the `admin_session` table, and delivered in HTTP-only cookies. For compatibility with existing clients, the same opaque token is also returned by login and accepted through `Authorization: Bearer ...` or the legacy `token` query parameter. Sessions default to two days and can be changed with `SESSION_DAYS`.

The schema uses the original TypeORM table and column names. Pointing this application at the existing Simsan database preserves the current users, services, configurations, locations, forms, and form/service relationships. Take a normal database backup before the production cutover; startup only uses `CREATE TABLE IF NOT EXISTS` and non-destructive seed checks.

## Optional mail variables

Core functionality works without email. Configure these variables to deliver verification, invoice/quote, contact, and campaign messages:

```dotenv
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_REQUIRE_TLS=true
SMTP_USER=mailer@example.com
SMTP_PASSWORD=secret
EMAIL_FROM=Simsan <mailer@example.com>
ADMIN_EMAIL=office@example.com
```

The legacy `EMAIL_USER` and `EMAIL_PWD` names remain supported as server-only fallbacks. When mail is not configured, requests complete normally and the skipped delivery is logged server-side.

## Compatibility and storage

The original Express endpoint paths are retained as rewrites, including the public contact endpoint. Historical email links at `/api/quote/:id/:uuid` and `/api/invoice/:id/:uuid` permanently redirect to the corresponding public Next.js document pages. Set `CORS_DOMAINS` to a comma-separated allowlist when a separate website or legacy browser client calls the application. Set `PUBLIC_APP_URL` to the canonical site origin used in emailed document links; the old `BACKEND_URI` variable is also accepted and its trailing `/api` is removed automatically.

Uploaded configuration images and generated invoice/quote PDFs default to `public/uploads` and `public/invoices`. For persistent self-hosted storage, set `IMAGE_UPLOAD_PATH` and `INVOICE_OUTPUT_PATH` to durable mounted directories. The database retains the generated invoice ID/path fields used by the original project.

On Vercel, PDFs are generated on demand instead of being written to the read-only deployment bundle. Configuration image uploads up to 3 MB are stored as inline database values so they remain available across serverless invocations.

`PRIMARY_ADMIN_EMAIL` protects the primary account from deactivation or deletion. It defaults to `DEFAULT_ADMIN_EMAIL`, then to `admin@simsanfrasermain.com`.

## Logging

The server writes structured JSON logs to stdout/stderr for startup, requests, authorization failures, login and verification, user/service/configuration/form changes, contact intake, campaigns, email delivery, PDF/Excel generation, slow database queries, query failures, and transaction rollbacks. Passwords, OTPs, request bodies, email bodies, and database parameter values are intentionally excluded. Set `SLOW_QUERY_MS` to change the default 500 ms slow-query threshold.

## Docker

The included Compose file starts both the app and PostgreSQL:

```bash
docker compose up --build
```

To connect to an existing managed database, deploy the `Dockerfile` image and provide the DB variables instead of starting the Compose database service.

## Verification

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm audit --omit=dev
```

The health endpoint is `GET /api/health`; it verifies that the schema is initialized and PostgreSQL is reachable.
