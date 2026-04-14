-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================
-- ENUMS
-- =====================

CREATE TYPE tournament_status AS ENUM ('draft', 'active', 'completed');

CREATE TYPE match_format AS ENUM ('bo1', 'bo3', 'bo5');

CREATE TYPE match_status AS ENUM ('scheduled', 'live', 'completed');

CREATE TYPE bracket_match_status AS ENUM ('pending', 'scheduled', 'live', 'completed');

CREATE TYPE member_role AS ENUM ('organizer', 'player', 'viewer');

CREATE TYPE bracket_type AS ENUM ('winners', 'losers', 'final');

-- =====================
-- TABLES
-- =====================

-- Users profile (extends auth.users)
CREATE TABLE users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username    TEXT NOT NULL UNIQUE CHECK (char_length(username) BETWEEN 2 AND 30),
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tournaments
CREATE TABLE tournaments (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                    TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 100),
  description             TEXT CHECK (char_length(description) <= 500),
  organizer_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_date              TIMESTAMPTZ,
  match_format            match_format NOT NULL DEFAULT 'bo3',
  num_groups              INTEGER NOT NULL DEFAULT 2 CHECK (num_groups BETWEEN 1 AND 8),
  enable_winners_bracket  BOOLEAN NOT NULL DEFAULT TRUE,
  enable_losers_bracket   BOOLEAN NOT NULL DEFAULT FALSE,
  num_boards              INTEGER NOT NULL DEFAULT 2 CHECK (num_boards BETWEEN 1 AND 16),
  avg_match_duration      INTEGER NOT NULL DEFAULT 20 CHECK (avg_match_duration BETWEEN 5 AND 120),
  status                  tournament_status NOT NULL DEFAULT 'draft',
  invite_code             TEXT NOT NULL UNIQUE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tournament members
CREATE TABLE tournament_members (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id   UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  display_name    TEXT NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 50),
  role            member_role NOT NULL DEFAULT 'player',
  seed            INTEGER,
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tournament_id, user_id)
);

-- Groups
CREATE TABLE groups (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id   UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  order_index     INTEGER NOT NULL DEFAULT 0
);

-- Group members (which tournament_member is in which group)
CREATE TABLE group_members (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id    UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  member_id   UUID NOT NULL REFERENCES tournament_members(id) ON DELETE CASCADE,
  position    INTEGER NOT NULL DEFAULT 0,
  UNIQUE (group_id, member_id)
);

-- Group matches (round-robin within a group)
CREATE TABLE group_matches (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id        UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  tournament_id   UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  home_member_id  UUID NOT NULL REFERENCES tournament_members(id),
  away_member_id  UUID NOT NULL REFERENCES tournament_members(id),
  board_number    INTEGER,
  scheduled_at    TIMESTAMPTZ,
  status          match_status NOT NULL DEFAULT 'scheduled',
  home_score      INTEGER NOT NULL DEFAULT 0,
  away_score      INTEGER NOT NULL DEFAULT 0,
  winner_member_id UUID REFERENCES tournament_members(id),
  round           INTEGER NOT NULL DEFAULT 1,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Group standings
CREATE TABLE group_standings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id        UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  member_id       UUID NOT NULL REFERENCES tournament_members(id) ON DELETE CASCADE,
  played          INTEGER NOT NULL DEFAULT 0,
  wins            INTEGER NOT NULL DEFAULT 0,
  losses          INTEGER NOT NULL DEFAULT 0,
  legs_for        INTEGER NOT NULL DEFAULT 0,
  legs_against    INTEGER NOT NULL DEFAULT 0,
  leg_difference  INTEGER GENERATED ALWAYS AS (legs_for - legs_against) STORED,
  points          INTEGER GENERATED ALWAYS AS (wins * 2) STORED,
  position        INTEGER NOT NULL DEFAULT 0,
  UNIQUE (group_id, member_id)
);

-- Brackets
CREATE TABLE brackets (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id   UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  type            bracket_type NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bracket matches
CREATE TABLE bracket_matches (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bracket_id            UUID NOT NULL REFERENCES brackets(id) ON DELETE CASCADE,
  tournament_id         UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  round                 INTEGER NOT NULL,
  match_number          INTEGER NOT NULL,
  home_member_id        UUID REFERENCES tournament_members(id),
  away_member_id        UUID REFERENCES tournament_members(id),
  board_number          INTEGER,
  scheduled_at          TIMESTAMPTZ,
  status                bracket_match_status NOT NULL DEFAULT 'pending',
  home_score            INTEGER NOT NULL DEFAULT 0,
  away_score            INTEGER NOT NULL DEFAULT 0,
  winner_member_id      UUID REFERENCES tournament_members(id),
  loser_member_id       UUID REFERENCES tournament_members(id),
  next_match_id         UUID REFERENCES bracket_matches(id),
  loser_next_match_id   UUID REFERENCES bracket_matches(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================
-- ROW LEVEL SECURITY
-- =====================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_standings ENABLE ROW LEVEL SECURITY;
ALTER TABLE brackets ENABLE ROW LEVEL SECURITY;
ALTER TABLE bracket_matches ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can read all profiles"
  ON users FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- Tournaments policies
CREATE POLICY "Anyone can read tournaments"
  ON tournaments FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create tournaments"
  ON tournaments FOR INSERT WITH CHECK (auth.uid() = organizer_id);

CREATE POLICY "Organizer can update tournament"
  ON tournaments FOR UPDATE USING (auth.uid() = organizer_id);

CREATE POLICY "Organizer can delete tournament"
  ON tournaments FOR DELETE USING (auth.uid() = organizer_id);

-- Tournament members policies
CREATE POLICY "Anyone can read tournament members"
  ON tournament_members FOR SELECT USING (true);

CREATE POLICY "Organizer can manage members"
  ON tournament_members FOR ALL USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_id AND t.organizer_id = auth.uid()
    )
  );

CREATE POLICY "Users can join via invite"
  ON tournament_members FOR INSERT WITH CHECK (
    auth.uid() = user_id AND role = 'player'
  );

CREATE POLICY "Users can update own membership"
  ON tournament_members FOR UPDATE USING (auth.uid() = user_id);

-- Groups policies
CREATE POLICY "Anyone can read groups"
  ON groups FOR SELECT USING (true);

CREATE POLICY "Organizer can manage groups"
  ON groups FOR ALL USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_id AND t.organizer_id = auth.uid()
    )
  );

-- Group members policies
CREATE POLICY "Anyone can read group members"
  ON group_members FOR SELECT USING (true);

CREATE POLICY "Organizer can manage group members"
  ON group_members FOR ALL USING (
    EXISTS (
      SELECT 1 FROM groups g
      JOIN tournaments t ON t.id = g.tournament_id
      WHERE g.id = group_id AND t.organizer_id = auth.uid()
    )
  );

-- Group matches policies
CREATE POLICY "Anyone can read group matches"
  ON group_matches FOR SELECT USING (true);

CREATE POLICY "Organizer can manage group matches"
  ON group_matches FOR ALL USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_id AND t.organizer_id = auth.uid()
    )
  );

CREATE POLICY "Players can update own match scores"
  ON group_matches FOR UPDATE USING (
    status != 'completed' AND (
      EXISTS (
        SELECT 1 FROM tournament_members tm
        WHERE tm.id IN (home_member_id, away_member_id)
        AND tm.user_id = auth.uid()
      )
    )
  );

-- Group standings policies
CREATE POLICY "Anyone can read standings"
  ON group_standings FOR SELECT USING (true);

CREATE POLICY "Organizer can manage standings"
  ON group_standings FOR ALL USING (
    EXISTS (
      SELECT 1 FROM groups g
      JOIN tournaments t ON t.id = g.tournament_id
      WHERE g.id = group_id AND t.organizer_id = auth.uid()
    )
  );

-- Brackets policies
CREATE POLICY "Anyone can read brackets"
  ON brackets FOR SELECT USING (true);

CREATE POLICY "Organizer can manage brackets"
  ON brackets FOR ALL USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_id AND t.organizer_id = auth.uid()
    )
  );

-- Bracket matches policies
CREATE POLICY "Anyone can read bracket matches"
  ON bracket_matches FOR SELECT USING (true);

CREATE POLICY "Organizer can manage bracket matches"
  ON bracket_matches FOR ALL USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_id AND t.organizer_id = auth.uid()
    )
  );

CREATE POLICY "Players can update own bracket match scores"
  ON bracket_matches FOR UPDATE USING (
    status != 'completed' AND (
      EXISTS (
        SELECT 1 FROM tournament_members tm
        WHERE tm.id IN (home_member_id, away_member_id)
        AND tm.user_id = auth.uid()
      )
    )
  );

-- =====================
-- REALTIME
-- =====================

ALTER PUBLICATION supabase_realtime ADD TABLE group_matches;
ALTER PUBLICATION supabase_realtime ADD TABLE bracket_matches;
ALTER PUBLICATION supabase_realtime ADD TABLE group_standings;
ALTER PUBLICATION supabase_realtime ADD TABLE tournaments;

-- =====================
-- INDEXES
-- =====================

CREATE INDEX idx_tournaments_organizer ON tournaments(organizer_id);
CREATE INDEX idx_tournaments_invite_code ON tournaments(invite_code);
CREATE INDEX idx_tournament_members_tournament ON tournament_members(tournament_id);
CREATE INDEX idx_tournament_members_user ON tournament_members(user_id);
CREATE INDEX idx_groups_tournament ON groups(tournament_id);
CREATE INDEX idx_group_members_group ON group_members(group_id);
CREATE INDEX idx_group_matches_tournament ON group_matches(tournament_id);
CREATE INDEX idx_group_matches_group ON group_matches(group_id);
CREATE INDEX idx_group_standings_group ON group_standings(group_id);
CREATE INDEX idx_bracket_matches_tournament ON bracket_matches(tournament_id);
CREATE INDEX idx_bracket_matches_bracket ON bracket_matches(bracket_id);
