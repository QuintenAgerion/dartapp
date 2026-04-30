ALTER TABLE bracket_matches
  ADD COLUMN IF NOT EXISTS home_source_group_idx INTEGER,
  ADD COLUMN IF NOT EXISTS home_source_position  INTEGER,
  ADD COLUMN IF NOT EXISTS away_source_group_idx INTEGER,
  ADD COLUMN IF NOT EXISTS away_source_position  INTEGER;
