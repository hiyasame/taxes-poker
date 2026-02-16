
import { Card } from './Card';

export enum PlayerStatus {
    Active = 'ACTIVE',
    Folded = 'FOLDED',
    AllIn = 'ALL_IN',
    SittingOut = 'SITTING_OUT'
}

export class Player {
    public id: string;
    public name: string;
    public stack: number;
    public hand: Card[] = [];
    public status: PlayerStatus = PlayerStatus.Active;
    public currentBet: number = 0;
    public totalBetThisRound: number = 0; // Tracks total contributed in current betting round
    public totalContributed: number = 0; // Tracks total contributed in the whole hand
    public position: number = -1; // -1 if not seated
    public lastAction?: { type: string; amount?: number };

    constructor(id: string, name: string, stack: number) {
        this.id = id;
        this.name = name;
        this.stack = stack;
    }

    resetForRound() {
        this.hand = [];
        this.status = this.stack > 0 ? PlayerStatus.Active : PlayerStatus.SittingOut;
        this.currentBet = 0;
        this.totalBetThisRound = 0;
        this.totalContributed = 0;
    }

    bet(amount: number): number {
        if (amount > this.stack) {
            amount = this.stack; // All-in effectively
        }
        this.stack -= amount;
        this.currentBet += amount;
        this.totalBetThisRound += amount;
        this.totalContributed += amount;
        if (this.stack === 0) {
            this.status = PlayerStatus.AllIn;
        }
        return amount;
    }

    fold() {
        this.status = PlayerStatus.Folded;
        this.hand = [];
    }
}
