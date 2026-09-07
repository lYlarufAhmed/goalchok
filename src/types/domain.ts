export type Role = 'ORG_ADMIN' | 'TOURNAMENT_MANAGER' | 'REFEREE';
export type MatchStatus = 'SCHEDULED' | 'LIVE' | 'COMPLETED';

export interface Organization {
  id: string;
  name: string;
  createdAt: Date;
}

export interface UserRole {
  orgId: string;
  role: Role;
}

export interface Tournament {
  id: string;
  orgId: string;
  name: string;
  startDate: Date;
  endDate?: Date;
  isPublished: boolean;
}

export interface Team {
  id: string;
  tournamentId: string;
  name: string;
  logoUrl?: string;
  group?: string; // Group A, B, C, etc.
}

export type Match = {
  id: string;
  tournamentId: string;
  homeTeamId: string;
  awayTeamId: string;
  group?: string; // e.g., 'A', 'B'
  matchTime: Date;
} & (
  | { status: 'SCHEDULED' }
  | { status: 'LIVE'; homeScore: number; awayScore: number; currentMinute?: number }
  | { status: 'COMPLETED'; homeScore: number; awayScore: number; winnerId?: string; isDraw: boolean }
);
