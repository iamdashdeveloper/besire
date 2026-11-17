# Besire course API

Standalone Fastify API for course authoring and the learner catalogue.

## Run

From this directory, install dependencies and start the API:

```sh
npm install
npm run dev
```

The API listens on port `3001` by default. Startup applies the additive,
idempotent SQL migrations in `migrations/001_courses.sql`,
`migrations/002_billing.sql`, `migrations/003_course_purchases.sql`, and
`migrations/004_desktop_profiles.sql`. This happens on every server start; review the
migrations and back up the target database before deploying a release that
contains a new migration. Set `PORT` and
`WEB_ORIGIN` in `.env` to override the defaults; localhost and 127.0.0.1 on
Vite's default port are allowed by default. The web app proxies `/api`
requests to this local API during Vite development.

Copy `.env.example` as a variable-name reference. The existing `.env` is
ignored by git and must never be committed. Course write routes require a
dedicated administrator sign-in, separate from regular Besire/Clerk accounts.
`COURSE_ADMIN_USERNAME` and `COURSE_ADMIN_PASSWORD` configure the credentials
(the requested local defaults are `admin` and `besire`). Successful logins use
an eight-hour, HTTP-only, SameSite=Strict signed session cookie with a
cryptographically random per-process signing key. Failed sign-ins are rate
limited. Configure unique credentials before exposing this API publicly; the
requested default password is for temporary local use only.

Asset uploads use short-lived presigned S3-compatible Neon Storage URLs.
Configure valid `AWS_ENDPOINT_URL_S3`, `AWS_ACCESS_KEY_ID`,
`AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, and `S3_BUCKET` values before uploading.
Buckets remain private; learner-facing asset links are short-lived signed GET
URLs. Files are stored in object storage, while references and metadata remain
in Postgres.

## Besire Pro billing

Billing uses the same Postgres database and Fastify API as the course
application. No payment or subscription tables are shared with course
enrollments. Clerk bearer tokens are verified by the API; the billing identity
and email are loaded from Clerk rather than accepted from browser input.
Paystack transactions are verified server-side before Pro access is granted.
The browser return URL alone never activates access.

Configure these backend environment variables:

- `CLERK_SECRET_KEY` — Clerk backend secret for verifying sessions and loading
  the signed-in user's verified primary email.
- `CLERK_AUTHORIZED_PARTIES` — comma-separated trusted frontend origins used
  when validating Clerk session tokens. Include production web origins and
  `tauri://localhost` for packaged Tauri desktop builds.
- `PAYSTACK_SECRET_KEY` — Paystack secret key; it is used only by Fastify.
- `PAYSTACK_MONTHLY_PLAN_CODE` — optional at first; the Paystack plan code for
  the KES 2,000 monthly recurring plan. Automatic renewal remains unavailable
  unless the API confirms that this plan is KES 2,000 and monthly.
- `BILLING_TOKEN_ENCRYPTION_KEY` — a private, stable random key of at least 32
  characters used to encrypt Paystack cancellation tokens at rest. Keep it
  consistent between deployments and back it up securely.
- `WEB_APP_URL` — public origin of the React app; Paystack returns to
  `${WEB_APP_URL}/billing/return`.
- `WEB_ORIGIN` — comma-separated allowed origins, including the deployed React
  app, desktop development origins (`http://localhost:1420` and
  `http://127.0.0.1:1420`), and Tauri origins (`tauri://localhost` on
  macOS/Linux and `http://tauri.localhost` on Windows), for CORS.
- `DATABASE_URL` or `DATABASE_URL_POOLED` — existing Postgres connection
  configuration; no new database service is introduced.

The web application needs `VITE_CLERK_PUBLISHABLE_KEY` as before and
`VITE_API_URL` only when its API is not reachable at the same origin. The
`apps/web/.env.example` and `apps/backend/.env.example` files list the
respective variable names; add real values to deployment secret configuration,
not to either example file.

In the Paystack dashboard, configure the webhook URL as
`https://<backend-origin>/api/paystack/webhook`. The webhook secret is the
server-side `PAYSTACK_SECRET_KEY`; do not send it to the frontend. Enable
transaction-success/failure/reversal/refund and subscription lifecycle events
supported by the account, including `charge.success`, `charge.failed`,
`charge.reversed`, `refund.processed`, `subscription.create`,
`subscription.not_renew`, `subscription.disable`, and
`invoice.payment_failed`. Create a KES 2,000 monthly plan and set its plan code
in `PAYSTACK_MONTHLY_PLAN_CODE` to expose automatic renewal. The API validates
that plan's configured amount, currency, and interval before offering
subscription checkout. Manual checkout is a separate one-time transaction
with a server-defined KES 2,000 amount and never includes a plan.

Recurring billing eligibility for a particular Kenyan merchant account and
payment method cannot be confirmed by code alone. Test plan creation and an
end-to-end subscription in the live Paystack dashboard/account before enabling
the subscription option for customers. Until then, only manual payments are
available when subscription configuration is missing or invalid.

## API overview

- `GET /api/courses` — published courses for learners
- `GET /api/courses?manage=true` — all courses (draft and published), requires the administrator session
- `POST /api/courses`, `GET/PATCH/DELETE /api/courses/:id`
- `POST /api/courses/:id/publish`
- `POST /api/courses/:courseId/modules`
- `PUT /api/courses/:courseId/modules/reorder`
- `PATCH/DELETE /api/modules/:id`
- `POST /api/modules/:id/lessons`
- `PUT /api/modules/:id/lessons/reorder`
- `PATCH/DELETE /api/lessons/:id`
- `POST /api/lessons/:id/blocks`
- `PUT /api/lessons/:id/blocks/reorder`
- `PATCH/DELETE /api/blocks/:id`
- `POST /api/assets/upload-url`
- `POST /api/assets/:id/complete`
- `DELETE /api/assets/:id`
- `POST /api/courses/:id/purchase` — authenticated one-time paid-course checkout
- `GET /api/course-purchases/verify?reference=...` — authenticated server-side purchase verification
- `GET /api/admin/course-sales` — administrator-only course sales totals and filtered purchase list
- `GET /api/admin/course-sales/:id` — administrator-only individual transaction details
- `GET /api/billing/options` — reports whether the configured monthly plan is valid
- `POST /api/billing/checkout` — authenticated manual or subscription checkout
- `GET /api/billing/status` — authenticated current entitlement
- `GET /api/billing/checkout/status?reference=...` — authenticated server-side verification
- `POST /api/billing/subscription/cancel` — authenticated cancellation of automatic renewal
- `POST /api/paystack/webhook` — Paystack-signed lifecycle events

A course can be published after it has a title, description, at least one
module and lesson, and at least one non-empty text block or completed media
block. The public catalogue and administrator dashboard read the same courses
and course assets from Postgres; the public endpoint filters to published
courses, while the administrator endpoint includes drafts. Paid course details
and lesson content are returned only to an administrator or an active
enrollment. Free course content remains publicly accessible. Paid courses use
one-time KES Paystack transactions at the price stored on the published course;
the checkout amount and course association are resolved on the API, then the
Paystack transaction is verified before an enrollment is recorded. Purchase
records and webhook idempotency are isolated from Besire Pro billing. Full
refunds/reversals revoke the purchase enrollment unless another paid purchase
still grants access. Course purchase sales totals use verified transaction
records and are gross transaction amounts less recorded refunds; settlement,
provider fees, and funds available are not inferred. No extra environment
variables are required. M-PESA is available only if enabled for the merchant's
Paystack account and the KES checkout supports it; no live payment method was
verified during implementation.
