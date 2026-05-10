-- Manual migration: Add Bloom (cycle profile + period logs) tables.
-- Idempotent — safe to run multiple times.

BEGIN;

-- 1. cycle_profiles — one row per user
CREATE TABLE IF NOT EXISTS cycle_profiles (
  id                  uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid         NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  birth_date          date,
  average_cycle_days  integer      DEFAULT 28,
  last_period_start   date,
  stage               text         NOT NULL DEFAULT 'unknown',
  ai_access_level     jsonb        NOT NULL DEFAULT '{}'::jsonb,
  created_at          timestamp(3) NOT NULL DEFAULT now(),
  updated_at          timestamp(3) NOT NULL DEFAULT now()
);

-- 2. period_logs — daily log entries
CREATE TABLE IF NOT EXISTS period_logs (
  id              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  log_date        date         NOT NULL,
  flow            text,
  is_period_start boolean      NOT NULL DEFAULT false,
  notes           text,
  payload         jsonb        NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamp(3) NOT NULL DEFAULT now(),
  updated_at      timestamp(3) NOT NULL DEFAULT now()
);

-- One log per user per day
ALTER TABLE period_logs
  DROP CONSTRAINT IF EXISTS period_logs_user_id_log_date_key;
ALTER TABLE period_logs
  ADD CONSTRAINT period_logs_user_id_log_date_key UNIQUE (user_id, log_date);

CREATE INDEX IF NOT EXISTS period_logs_user_id_log_date_idx
  ON period_logs(user_id, log_date);

COMMIT;
