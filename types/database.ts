// ─── Enums ────────────────────────────────────────────────────────────────────

export type TournamentStatus = 'draft' | 'active' | 'completed'

export type MatchFormat = 'bo1' | 'bo3' | 'bo5'

export type MatchStatus = 'scheduled' | 'live' | 'completed'

export type BracketMatchStatus = 'pending' | 'scheduled' | 'live' | 'completed'

export type MemberRole = 'organizer' | 'player' | 'viewer'

export type BracketType = 'winners' | 'losers' | 'final'

// ─── Table Row Types ───────────────────────────────────────────────────────────

export type UserProfile = {
  id: string
  username: string
  avatar_url: string | null
  created_at: string
}

export type Tournament = {
  id: string
  name: string
  description: string | null
  organizer_id: string
  start_date: string | null
  match_format: MatchFormat
  num_groups: number
  enable_winners_bracket: boolean
  enable_losers_bracket: boolean
  winners_per_group: number
  losers_per_group: number
  num_boards: number
  avg_match_duration: number
  use_scorers: boolean
  single_board_per_group: boolean
  status: TournamentStatus
  invite_code: string
  created_at: string
}

export type TournamentMember = {
  id: string
  tournament_id: string
  user_id: string | null
  display_name: string
  role: MemberRole
  seed: number | null
  joined_at: string
}

export type Group = {
  id: string
  tournament_id: string
  name: string
  order_index: number
}

export type GroupMember = {
  id: string
  group_id: string
  member_id: string
  position: number
}

export type GroupMatch = {
  id: string
  group_id: string
  tournament_id: string
  home_member_id: string
  away_member_id: string
  board_number: number | null
  scheduled_at: string | null
  status: MatchStatus
  home_score: number
  away_score: number
  winner_member_id: string | null
  scorer_member_id: string | null
  round: number
  created_at: string
}

export type GroupStanding = {
  id: string
  group_id: string
  member_id: string
  played: number
  wins: number
  losses: number
  legs_for: number
  legs_against: number
  leg_difference: number
  points: number
  position: number
}

export type Bracket = {
  id: string
  tournament_id: string
  type: BracketType
  created_at: string
}

export type BracketMatch = {
  id: string
  bracket_id: string
  tournament_id: string
  round: number
  match_number: number
  home_member_id: string | null
  away_member_id: string | null
  home_source_group_idx: number | null
  home_source_position: number | null
  away_source_group_idx: number | null
  away_source_position: number | null
  board_number: number | null
  scheduled_at: string | null
  status: BracketMatchStatus
  match_format: MatchFormat | null
  home_score: number
  away_score: number
  winner_member_id: string | null
  loser_member_id: string | null
  scorer_member_id: string | null
  next_match_id: string | null
  loser_next_match_id: string | null
  created_at: string
}

// ─── Insert Types ──────────────────────────────────────────────────────────────

export type TournamentInsert = Omit<Tournament, 'id' | 'created_at'>

export type TournamentMemberInsert = {
  tournament_id: string
  user_id?: string | null
  display_name: string
  role: MemberRole
  seed?: number | null
}

export type GroupInsert = Omit<Group, 'id'>
export type GroupMemberInsert = Omit<GroupMember, 'id'>
export type GroupMatchInsert = Omit<GroupMatch, 'id' | 'created_at'>
export type GroupStandingInsert = Omit<GroupStanding, 'id' | 'leg_difference' | 'points'>
export type BracketInsert = Omit<Bracket, 'id' | 'created_at'>
export type BracketMatchInsert = Omit<BracketMatch, 'id' | 'created_at' | 'match_format' | 'home_source_group_idx' | 'home_source_position' | 'away_source_group_idx' | 'away_source_position'> & {
  match_format?: MatchFormat | null
  home_source_group_idx?: number | null
  home_source_position?: number | null
  away_source_group_idx?: number | null
  away_source_position?: number | null
}

export type UserProfileInsert = {
  id: string
  username: string
  avatar_url?: string | null
}

// ─── Joined / View Types ───────────────────────────────────────────────────────

export type GroupMatchWithPlayers = GroupMatch & {
  home_member: TournamentMember
  away_member: TournamentMember
  winner_member?: TournamentMember | null
}

export type GroupStandingWithMember = GroupStanding & {
  member: TournamentMember
}

export type BracketMatchWithPlayers = BracketMatch & {
  home_member: TournamentMember | null
  away_member: TournamentMember | null
  winner_member?: TournamentMember | null
}

export type TournamentWithOrganizer = Tournament & {
  organizer: UserProfile
}

export type GroupWithMembers = Group & {
  members: (GroupMember & { member: TournamentMember })[]
}

// ─── Supabase Database Generic ─────────────────────────────────────────────────
// Format required by @supabase/supabase-js v2.103+ (postgrest-js v12)
// Each table must include Relationships: [] array

export type Database = {
  public: {
    Tables: {
      users: {
        Row: UserProfile
        Insert: UserProfileInsert
        Update: Partial<Omit<UserProfile, 'id' | 'created_at'>>
        Relationships: []
      }
      tournaments: {
        Row: Tournament
        Insert: TournamentInsert
        Update: Partial<TournamentInsert>
        Relationships: []
      }
      tournament_members: {
        Row: TournamentMember
        Insert: TournamentMemberInsert
        Update: Partial<TournamentMemberInsert>
        Relationships: []
      }
      groups: {
        Row: Group
        Insert: GroupInsert
        Update: Partial<GroupInsert>
        Relationships: []
      }
      group_members: {
        Row: GroupMember
        Insert: GroupMemberInsert
        Update: Partial<GroupMemberInsert>
        Relationships: []
      }
      group_matches: {
        Row: GroupMatch
        Insert: GroupMatchInsert
        Update: Partial<GroupMatchInsert>
        Relationships: []
      }
      group_standings: {
        Row: GroupStanding
        Insert: GroupStandingInsert
        Update: Partial<GroupStandingInsert>
        Relationships: []
      }
      brackets: {
        Row: Bracket
        Insert: BracketInsert
        Update: Partial<BracketInsert>
        Relationships: []
      }
      bracket_matches: {
        Row: BracketMatch
        Insert: BracketMatchInsert
        Update: Partial<BracketMatchInsert>
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: {
      tournament_status: TournamentStatus
      match_format: MatchFormat
      match_status: MatchStatus
      bracket_match_status: BracketMatchStatus
      member_role: MemberRole
      bracket_type: BracketType
    }
    CompositeTypes: { [_ in never]: never }
  }
}
