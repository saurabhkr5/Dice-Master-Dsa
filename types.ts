export type DiceSkin = 'classic' | 'neon' | 'gold' | 'cyber';

export interface Player {
  id: string;
  name: string;
  score: number;
  avatarColor: string;
}

export interface PlayerStats {
  totalRolls: number;
  highestTurnScore: number;
  cumulativeScore: number;
}

export interface RoundSnapshot {
    round: number;
    leaderboard: Player[];
}

export enum GamePhase {
  LANDING = 'LANDING',
  SETUP = 'SETUP',
  PLAYING = 'PLAYING',
  ROUND_SUMMARY = 'ROUND_SUMMARY',
  GAME_OVER = 'GAME_OVER',
}

export interface RollResult {
  die1: number;
  die2: number;
  total: number;
  isDouble: boolean;
  bonus: number;
}

export type ScoreMap = Map<string, number>;