
import { Card } from './Card';

export enum PlayerStatus {
    Active = 'ACTIVE',
    Folded = 'FOLDED',
    AllIn = 'ALL_IN',
    SittingOut = 'SITTING_OUT',
    Spectator = 'SPECTATOR'
}

export class Player {
    public id: string;
    public name: string;
    public stack: number;
    public hand: Card[] = [];
    public status: PlayerStatus = PlayerStatus.Active;
    public currentBet: number = 0;
    public totalBetThisRound: number = 0;
    public totalContributed: number = 0;
    public position: number = -1;
    public lastAction?: { type: string; amount?: number };
    public isSpectator: boolean = false;
    public hasViewedCards: boolean = false;
    public ip: string = '';
    public isConnected: boolean = true;
    public username: string = '';
    public password: string = '';
    public isReady: boolean = false;
    public seatIndex: number = -1;
    public allowedViewers: Set<string> = new Set(); // 允许查看手牌的玩家ID列表

    constructor(id: string, name: string, stack: number, isSpectator: boolean = false, ip: string = '', username: string = '', password: string = '') {
        this.id = id;
        this.name = name;
        this.stack = stack;
        this.isSpectator = isSpectator;
        this.ip = ip;
        this.username = username;
        this.password = password;
        if (isSpectator) {
            this.status = PlayerStatus.Spectator;
        }
    }

    resetForRound() {
        this.hand = [];
        this.status = this.stack > 0 ? PlayerStatus.Active : PlayerStatus.SittingOut;
        this.currentBet = 0;
        this.totalBetThisRound = 0;
        this.totalContributed = 0;
        this.hasViewedCards = false;
        this.allowedViewers.clear();
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
