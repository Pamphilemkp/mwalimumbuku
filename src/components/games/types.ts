export type Difficulty = 'easy' | 'medium' | 'hard';

export interface GameProps {
  onScore: (pts: number) => void;
  difficulty: Difficulty;
  onGameEnd?: (score: number, timeSeconds: number) => void;
}

/** Time limit in seconds per difficulty */
export const TIME_LIMITS: Record<Difficulty, number> = {
  easy: 120,
  medium: 90,
  hard: 60,
};

