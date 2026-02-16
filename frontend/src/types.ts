
export const Suit = {
    Hearts: 'HEARTS',
    Diamonds: 'DIAMONDS',
    Spades: 'SPADES',
    Clubs: 'CLUBS'
} as const;

export type Suit = typeof Suit[keyof typeof Suit];

export const Rank = {
    Two: 2, Three: 3, Four: 4, Five: 5, Six: 6, Seven: 7, Eight: 8,
    Nine: 9, Ten: 10, Jack: 11, Queen: 12, King: 13, Ace: 14
} as const;

export type Rank = typeof Rank[keyof typeof Rank];

export const PlayerStatus = {
    Active: 'ACTIVE',
    Folded: 'FOLDED',
    AllIn: 'ALL_IN',
    SittingOut: 'SITTING_OUT',
    Spectator: 'SPECTATOR'
} as const;

export type PlayerStatus = typeof PlayerStatus[keyof typeof PlayerStatus];

export const GameState = {
    Waiting: 'WAITING',
    Preflop: 'PREFLOP',
    Flop: 'FLOP',
    Turn: 'TURN',
    River: 'RIVER',
    Showdown: 'SHOWDOWN',
    Finished: 'FINISHED'
} as const;

export type GameState = typeof GameState[keyof typeof GameState];

export interface Card {
    suit: Suit;
    rank: Rank;
}

export interface PlayerView {
    id: string;
    name: string;
    stack: number;
    currentBet: number;
    status: PlayerStatus;
    hand?: Card[];
    isSelf: boolean;
    position: number;
    isDealer: boolean;
    isCurrentTurn: boolean;
    totalContributed: number;
    lastAction?: {
        type: string;
        amount?: number;
    };
    hasViewedCards: boolean;
    isReady: boolean;
    seatIndex: number;
    isSpectator?: boolean;
}

export interface RoundResult {
    playerId: string;
    playerName: string;
    winAmount: number;
}

export interface GameView {
    state: GameState;
    communityCards: Card[];
    pot: number;
    currentMaxBet: number;
    players: PlayerView[];
    spectators: PlayerView[];
    me?: PlayerView;
    winners?: string[];
    currentHandType?: string;
    isSpectator?: boolean;
    totalContributed?: number;
    availableSeats: number[];
    lastRoundResults?: RoundResult[];
}
