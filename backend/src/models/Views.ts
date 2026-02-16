
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
    hand?: Card[]; // Only visible to the player themselves
    isSelf: boolean;
    position: number;
    isDealer: boolean;
    isCurrentTurn: boolean;
    lastAction?: {
        type: string;
        amount?: number;
    };
}

export interface GameView {
    state: GameState;
    communityCards: Card[];
    pot: number;
    currentMaxBet: number;
    players: PlayerView[];
    me?: PlayerView;
    winners?: string[]; // IDs of winners
    currentHandType?: string; // e.g., "一对", "两对" - for the current player
}
