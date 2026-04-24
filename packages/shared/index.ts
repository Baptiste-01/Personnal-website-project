export interface Room {
    id: string;
    name: string;
    players: number;
    status: 'playing' | 'waiting';
}

export interface GameState {
    roomId: string;
    currentWord: string | null;
    timer: number;
}