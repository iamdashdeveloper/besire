CREATE TABLE IF NOT EXISTS desktop_user_profiles (
  user_id text PRIMARY KEY,
  profile jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
