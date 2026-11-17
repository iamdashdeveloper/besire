CREATE TABLE IF NOT EXISTS billing_users (
  user_id text PRIMARY KEY,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS billing_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES billing_users(user_id) ON DELETE CASCADE,
  paystack_subscription_code text UNIQUE,
  paystack_customer_code text,
  paystack_plan_code text NOT NULL,
  paystack_email_token_ciphertext text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'past_due', 'non_renewing', 'cancelled', 'expired')),
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  current_period_start timestamptz,
  current_period_end timestamptz,
  next_payment_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS billing_one_current_subscription_per_user_idx
  ON billing_subscriptions (user_id)
  WHERE status IN ('pending', 'active', 'past_due', 'non_renewing');

CREATE TABLE IF NOT EXISTS billing_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES billing_users(user_id) ON DELETE CASCADE,
  payment_mode text NOT NULL CHECK (payment_mode IN ('manual', 'subscription')),
  paystack_reference text NOT NULL UNIQUE,
  idempotency_key text NOT NULL,
  amount_subunits bigint NOT NULL CHECK (amount_subunits = 200000),
  currency text NOT NULL CHECK (currency = 'KES'),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'success', 'failed', 'reversed')),
  checkout_url text,
  paystack_plan_code text,
  paystack_subscription_code text,
  paid_at timestamptz,
  period_start timestamptz,
  period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS billing_payments_user_created_idx
  ON billing_payments (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS billing_payments_subscription_ref_idx
  ON billing_payments (paystack_subscription_code, status)
  WHERE paystack_subscription_code IS NOT NULL;

CREATE TABLE IF NOT EXISTS billing_entitlements (
  user_id text PRIMARY KEY REFERENCES billing_users(user_id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  payment_mode text CHECK (payment_mode IN ('manual', 'subscription')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  subscription_status text
    CHECK (subscription_status IN ('pending', 'active', 'past_due', 'non_renewing', 'cancelled', 'expired')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS billing_webhook_events (
  event_key text PRIMARY KEY,
  event_type text NOT NULL,
  paystack_reference text,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz NOT NULL DEFAULT now()
);
