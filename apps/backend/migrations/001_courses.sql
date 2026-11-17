CREATE TABLE IF NOT EXISTS courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id text NOT NULL,
  creator_name text,
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  thumbnail_asset_id uuid,
  price integer NOT NULL DEFAULT 0 CHECK (price >= 0),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS course_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  uploader_id text NOT NULL,
  purpose text NOT NULL CHECK (purpose IN ('thumbnail', 'image', 'video')),
  object_key text NOT NULL UNIQUE,
  file_name text NOT NULL,
  content_type text NOT NULL,
  size_bytes bigint NOT NULL CHECK (size_bytes > 0),
  uploaded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE course_assets
  ADD COLUMN IF NOT EXISTS uploaded boolean NOT NULL DEFAULT false;

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS thumbnail_asset_id uuid REFERENCES course_assets(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS course_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  position integer NOT NULL CHECK (position >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, position)
);

CREATE TABLE IF NOT EXISTS course_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES course_modules(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  position integer NOT NULL CHECK (position >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (module_id, position)
);

CREATE TABLE IF NOT EXISTS lesson_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES course_lessons(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('text', 'image', 'video')),
  position integer NOT NULL CHECK (position >= 0),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  asset_id uuid REFERENCES course_assets(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lesson_id, position)
);

CREATE TABLE IF NOT EXISTS course_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, user_id)
);

CREATE INDEX IF NOT EXISTS courses_public_updated_idx
  ON courses (status, updated_at DESC);
CREATE INDEX IF NOT EXISTS courses_creator_updated_idx
  ON courses (creator_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS course_modules_order_idx
  ON course_modules (course_id, position);
CREATE INDEX IF NOT EXISTS course_lessons_order_idx
  ON course_lessons (module_id, position);
CREATE INDEX IF NOT EXISTS lesson_blocks_order_idx
  ON lesson_blocks (lesson_id, position);
CREATE INDEX IF NOT EXISTS course_enrollments_user_idx
  ON course_enrollments (user_id, course_id, status);
