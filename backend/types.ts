export type GameRule = 'throw-in' | 'neighbors' | 'with-tricks' | 'classic' | 'passing' | 'all' | 'fair-play' | 'draw';

export interface Player {
  id: string;
  name: string;
  avatarUrl?: string;
}

export interface RoomSettings {
  betAmount: number | string;
  maxPlayers: number;
  deckSize: 24 | 36 | 52;
  isPrivate: boolean;
  rules: GameRule[];
}
