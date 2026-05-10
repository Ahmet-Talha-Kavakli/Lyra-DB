-- Manual migration: Add Notebook model + link existing JournalEntry rows
-- Safe to run on a populated DB. Idempotent for re-runs (uses IF NOT EXISTS).

BEGIN;

-- 1. Create notebooks table
CREATE TABLE IF NOT EXISTS notebooks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notebook_type   text NOT NULL,            -- 'standard' | 'private' | 'custom'
  name            text NOT NULL,
  theme_id        text NOT NULL,
  thickness_id    text NOT NULL DEFAULT 'thick',
  silhouette      text NOT NULL DEFAULT 'classic',
  locked          boolean NOT NULL DEFAULT false,
  ai_accessible   boolean NOT NULL DEFAULT true,
  created_at      timestamp(3) NOT NULL DEFAULT now(),
  updated_at      timestamp(3) NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notebooks_user_id_notebook_type_idx
  ON notebooks(user_id, notebook_type);

-- 2. Bootstrap: every existing user gets a "Journal" (standard) and "Secret" (private)
INSERT INTO notebooks (user_id, notebook_type, name, theme_id, thickness_id, silhouette, locked, ai_accessible)
SELECT u.id, 'standard', 'Journal', 'amber', 'thick', 'classic', false, true
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM notebooks n
  WHERE n.user_id = u.id AND n.notebook_type = 'standard'
);

INSERT INTO notebooks (user_id, notebook_type, name, theme_id, thickness_id, silhouette, locked, ai_accessible)
SELECT u.id, 'private', 'Secret', 'azure', 'thick', 'arched', true, false
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM notebooks n
  WHERE n.user_id = u.id AND n.notebook_type = 'private'
);

-- 3. Add notebook_id to journal_entries (nullable initially so existing rows pass)
ALTER TABLE journal_entries
  ADD COLUMN IF NOT EXISTS notebook_id uuid;

-- 4. Backfill: link every existing journal_entry to its user's "Journal" notebook
UPDATE journal_entries je
SET notebook_id = n.id
FROM notebooks n
WHERE je.user_id = n.user_id
  AND n.notebook_type = 'standard'
  AND je.notebook_id IS NULL;

-- 5. Now NOT NULL + FK constraint
ALTER TABLE journal_entries
  ALTER COLUMN notebook_id SET NOT NULL;

-- FK constraint (idempotent: drop if exists, then add)
ALTER TABLE journal_entries
  DROP CONSTRAINT IF EXISTS journal_entries_notebook_id_fkey;

ALTER TABLE journal_entries
  ADD CONSTRAINT journal_entries_notebook_id_fkey
    FOREIGN KEY (notebook_id) REFERENCES notebooks(id) ON DELETE CASCADE;

-- 6. Replace old (user_id, entry_date) unique with (notebook_id, entry_date)
-- Old constraint name from Prisma's @@unique([userId, entryDate])
ALTER TABLE journal_entries
  DROP CONSTRAINT IF EXISTS journal_entries_user_id_entry_date_key;

-- New unique constraint per notebook+date
ALTER TABLE journal_entries
  DROP CONSTRAINT IF EXISTS journal_entries_notebook_id_entry_date_key;

ALTER TABLE journal_entries
  ADD CONSTRAINT journal_entries_notebook_id_entry_date_key
    UNIQUE (notebook_id, entry_date);

-- 7. Index for user-wide queries (e.g. recent entries across notebooks for AI)
CREATE INDEX IF NOT EXISTS journal_entries_user_id_entry_date_idx
  ON journal_entries(user_id, entry_date);

COMMIT;
