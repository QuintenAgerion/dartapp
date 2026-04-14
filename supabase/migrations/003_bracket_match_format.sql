-- Allow each bracket match to override the tournament's default match format
ALTER TABLE bracket_matches
  ADD COLUMN IF NOT EXISTS match_format match_format;
