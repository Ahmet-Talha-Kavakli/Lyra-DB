-- Bloom: period_logs.is_period_end kolonu (Adım 2A.4+)
-- Kullanıcı period'unun "son günü"nü işaretleyebilsin diye.
-- isPeriodStart pattern'i ile aynı — boolean flag, derive logic backend'de.
-- Idempotent: kolon yoksa ekler, varsa hiçbir şey yapmaz.

ALTER TABLE period_logs
  ADD COLUMN IF NOT EXISTS is_period_end BOOLEAN NOT NULL DEFAULT FALSE;
