
import { Card } from './Card';
import { PlayerStatus } from './Player';
import { GameState } from '../game/Game';
import { HandRank } from '../game/HandEvaluator';

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
    lastAction?: {
        type: string;
        amount?: number;
    };
    hasViewedCards: boolean;
    isReady: boolean;
    seatIndex: number;
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
}
