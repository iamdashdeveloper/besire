CREATE TABLE IF NOT EXISTS course_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
  user_id text NOT NULL,
  learner_email text NOT NULL,
  paystack_reference text NOT NULL UNIQUE,
  idempotency_key text NOT NULL,
  amount_subunits bigint NOT NULL CHECK (amount_subunits > 0),
  currency text NOT NULL DEFAULT 'KES' CHECK (currency = 'KES'),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'success', 'failed', 'cancelled', 'partially_refunded', 'refunded', 'reversed')),
  refunded_subunits bigint NOT NULL DEFAULT 0 CHECK (refunded_subunits >= 0),
  checkout_url text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key),
  CHECK (refunded_subunits <= amount_subunits)
);

CREATE UNIQUE INDEX IF NOT EXISTS course_purchases_one_pending_per_learner_idx
  ON course_purchases (course_id, user_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS course_purchases_sales_course_idx
  ON course_purchases (course_id, status, paid_at DESC);

CREATE INDEX IF NOT EXISTS course_purchases_sales_learner_idx
  ON course_purchases (user_id, paid_at DESC);

CREATE TABLE IF NOT EXISTS course_purchase_webhook_events (
  event_key text PRIMARY KEY,
  event_type text NOT NULL,
  paystack_reference text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS course_purchase_events_reference_idx
  ON course_purchase_webhook_events (paystack_reference, received_at DESC);
