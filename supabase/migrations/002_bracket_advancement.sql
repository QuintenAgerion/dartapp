-- Add per-group advancement configuration to tournaments
ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS winners_per_group INTEGER NOT NULL DEFAULT 2
    CHECK (winners_per_group BETWEEN 1 AND 8),
  ADD COLUMN IF NOT EXISTS losers_per_group INTEGER NOT NULL DEFAULT 0
    CHECK (losers_per_group BETWEEN 0 AND 8);
