export type Difficulty = 'easy' | 'medium' | 'hard';

export interface GameProps {
  onScore: (pts: number) => void;
  difficulty: Difficulty;
}
