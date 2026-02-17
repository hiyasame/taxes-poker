import {Deck} from '../models/Deck';
import {Player, PlayerStatus} from '../models/Player';
import {HandEvaluator} from './HandEvaluator';
import {Card} from '../models/Card';

export enum GameState {
    Waiting = 'WAITING',    // 准备阶段
    Preflop = 'PREFLOP',    // 开始游戏，但在翻牌前
    Flop = 'FLOP',          // 翻了三种
    Turn = 'TURN',          // 翻了第四张
    River = 'RIVER',        // 翻了第五张
    Showdown = 'SHOWDOWN',  // 比牌
}

export class Game {
    public deck: Deck;
    public players: Player[] = []; // 所有玩家
    public initActivePlayers: Player[] = []; // 参与当前局的玩家
    public activePlayers: Player[] = []; // 当前局剩下的玩家
    public communityCards: Card[] = [];
    public state: GameState = GameState.Waiting;
    public currentPot: number = 0;
    public currentMaxBet: number = 0;
    public dealerIndex: number = -1;
    public currentTurnIndex: number = 0;
    public currentTurnPlayerId: string = '';
    public minBet: number = 20;

    // Pot tracking
    private playersActedCount: number = 0;
    public winners: Player[] = [];
    public lastRoundResults: Map<string, number> = new Map(); // playerId -> winAmount

    constructor() {
        this.deck = new Deck();
    }

    startGame() {
        const noReadyPlayers = this.players.filter(p => !p.isSpectator && !p.isReady);
        if (noReadyPlayers.length !== 0) throw new Error("需要所有就坐玩家都准备才可开始");
        if (this.state !== GameState.Waiting) throw new Error("已经在牌局中了");

        this.state = GameState.Preflop;
        this.deck.reset();
        this.deck.shuffle();
        this.communityCards = [];
        this.currentPot = 0;
        this.winners = [];
        this.lastRoundResults.clear(); // 清空上一局结果
        this.activePlayers = this.players.filter(p => !p.isSpectator && p.isReady)
            .sort((a, b) => a.seatIndex - b.seatIndex);
        this.initActivePlayers = this.activePlayers;
        this.initActivePlayers.forEach(p => {
            p.resetForRound();
            p.lastAction = undefined;
        });

        // 发牌
        for (let i = 0; i < 2; i++) {
            this.initActivePlayers.forEach(p => {
                const card = this.deck.deal();
                if (card) p.hand.push(card);
            });
        }

        // 大小盲，采用随机计算
        const sbIndex = Math.floor(Math.random() * this.initActivePlayers.length);
        const bbIndex = (sbIndex + 1) % this.initActivePlayers.length;
        this.dealerIndex = sbIndex;

        const sbPlayer = this.initActivePlayers[sbIndex]!;
        const bbPlayer = this.initActivePlayers[bbIndex]!;

        sbPlayer.bet(Math.min(sbPlayer.stack, this.minBet / 2));
        bbPlayer.bet(Math.min(bbPlayer.stack, this.minBet));

        this.currentMaxBet = this.minBet;
        this.playersActedCount = 0;

        // 当前该谁来下注，因为大小盲是下注的固定值，所以开始是大盲后一个人
        this.currentTurnIndex = (bbIndex + 1) % this.initActivePlayers.length;
        this.currentTurnPlayerId = this.initActivePlayers[this.currentTurnIndex].id;
    }

    handleAction(playerId: string, action: 'fold' | 'check' | 'call' | 'raise' | 'allin', amount?: number) {
        const player = this.initActivePlayers[this.currentTurnIndex];
        if (player.id !== playerId) throw new Error("Not your turn");

        player.lastAction = { type: action, amount };

        switch (action) {
            case 'fold': // 弃牌
                player.fold();
                this.activePlayers = this.activePlayers.filter(p => p.id !== player.id);
                if (this.activePlayers.length === 1) {
                    // 如果弃牌后玩家只剩一个
                    this.endHandPrematurely();
                    return;
                }
                break;
            case 'check':
                if (player.currentBet < this.currentMaxBet) throw new Error("Cannot check, must call");
                this.playersActedCount++;
                break;
            case 'call':
                const callAmount = this.currentMaxBet - player.currentBet;
                player.bet(Math.min(callAmount, player.stack));
                this.playersActedCount++;
                break;
            case 'raise':
                if (!amount || amount <= this.currentMaxBet) throw new Error("Invalid raise");
                const raiseAmt = amount - player.currentBet;
                if (raiseAmt > player.stack) throw new Error("Not enough chips");
                player.bet(raiseAmt);
                this.currentMaxBet = amount;
                this.playersActedCount = 1;
                break;
            case 'allin':
                player.bet(player.stack);
                if (player.currentBet > this.currentMaxBet) {
                    this.currentMaxBet = player.currentBet;
                    this.playersActedCount = 1;
                } else {
                    this.playersActedCount++;
                }
                break;
        }

        const allMatched = this.activePlayers.every(p => p.currentBet === this.currentMaxBet);

        if (allMatched && this.playersActedCount >= this.activePlayers.length) {
            this.nextStage();
        } else {
            this.rotateTurn();
        }
    }

    rotateTurn() {
        let loop = 0;
        do {
            this.currentTurnIndex = (this.currentTurnIndex + 1) % this.initActivePlayers.length;
            loop++;
        } while (
            this.initActivePlayers[this.currentTurnIndex].status !== PlayerStatus.Active &&
            loop < this.initActivePlayers.length
        );
        this.currentTurnPlayerId = this.initActivePlayers[this.currentTurnIndex].id;
    }

    nextStage() {
        // Collect bets
        this.initActivePlayers.forEach(p => {
            this.currentPot += p.currentBet;
            p.currentBet = 0;
            p.lastAction = undefined; // Clear action icons/tags for new stage
        });
        this.currentMaxBet = 0;
        this.playersActedCount = 0; // Reset for next stage

        switch (this.state) {
            case GameState.Preflop:
                this.state = GameState.Flop;
                this.dealCommunity(3);
                console.log('Transition to FLOP, cards:', this.communityCards.length);
                break;
            case GameState.Flop:
                this.state = GameState.Turn;
                this.dealCommunity(1);
                console.log('Transition to TURN, cards:', this.communityCards.length);
                break;
            case GameState.Turn:
                this.state = GameState.River;
                this.dealCommunity(1);
                console.log('Transition to RIVER, cards:', this.communityCards.length);
                break;
            case GameState.River:
                console.log('Transition to SHOWDOWN');
                this.showdown();
                return;
        }

        // Turn resets to first active player after Dealer
        this.currentTurnIndex = this.dealerIndex;
        this.rotateTurn(); // Start from dealer + 1
    }

    dealCommunity(n: number) {
        this.deck.deal(); // Burn
        for (let i = 0; i < n; i++) {
            const c = this.deck.deal();
            if (c) this.communityCards.push(c);
        }
    }

    showdown() {
        if (this.state === GameState.Showdown) return;
        this.state = GameState.Showdown;

        const survivors = this.activePlayers;
        if (survivors.length === 0) return;

        this.calculateAndDistributePots();
        this.resetToWaiting();
    }

    private resetToWaiting() {
        this.state = GameState.Waiting;
        this.players.forEach(p => {
            p.isReady = false;
        });
    }

    private calculateAndDistributePots() {
        // 记录每个玩家本局开始前的筹码（用于计算输赢）
        const startingStacks = new Map<string, number>();
        this.initActivePlayers.forEach(p => {
            startingStacks.set(p.name, p.stack + p.totalContributed);
        });
        
        const distinctBets = Array.from(new Set(this.initActivePlayers.map(p => p.totalContributed)))
            .filter(b => b > 0)
            .sort((a, b) => a - b);

        let previousLevel = 0;
        const pots: { amount: number, eligible: Player[] }[] = [];

        for (const level of distinctBets) {
            const contributionPerPlayer = level - previousLevel;
            const contributors = this.initActivePlayers.filter(p => p.totalContributed >= level);
            const amount = contributionPerPlayer * contributors.length;

            // Only players who haven't folded are eligible to win a pot
            const eligible = contributors.filter(p => p.status !== PlayerStatus.Folded);

            if (amount > 0 && eligible.length > 0) {
                pots.push({ amount, eligible });
            } else if (amount > 0 && eligible.length === 0) {
                // This shouldn't happen in normal play (everyone who bet folded?), 
                // but if so, the money stays or goes to next eligible.
                // In poker, the last non-folder takes it.
            }
            previousLevel = level;
        }

        // For each pot, find winners among eligible
        for (const pot of pots) {
            const winners = this.getWinnersAmong(pot.eligible);
            const share = Math.floor(pot.amount / winners.length);
            const remainder = pot.amount % winners.length;

            winners.forEach(w => w.stack += share);
            // Give remainder to the first winner (approx)
            if (winners[0]) winners[0].stack += remainder;

            this.winners = Array.from(new Set([...this.winners, ...winners]));
        }
        
        // 计算每个玩家的输赢
        this.lastRoundResults.clear();
        this.initActivePlayers.forEach(p => {
            const startStack = startingStacks.get(p.name) || 0;
            const winAmount = p.stack - startStack;
            this.lastRoundResults.set(p.id, winAmount);
        });
    }

    private getWinnersAmong(candidates: Player[]): Player[] {
        if (candidates.length === 1) return candidates;

        const evaluations = candidates.map(p => ({
            player: p,
            hand: HandEvaluator.evaluate([...p.hand, ...this.communityCards])
        }));

        evaluations.sort((a, b) => {
            if (a.hand.rank !== b.hand.rank) return b.hand.rank - a.hand.rank;
            for (let i = 0; i < 5; i++) {
                if (a.hand.cards[i]!.rank !== b.hand.cards[i]!.rank) {
                    return b.hand.cards[i]!.rank - a.hand.cards[i]!.rank;
                }
            }
            return 0;
        });

        const best = evaluations[0]!;
        return evaluations.filter(e => {
            if (e.hand.rank !== best.hand.rank) return false;
            for (let i = 0; i < 5; i++) {
                if (e.hand.cards[i]!.rank !== best.hand.cards[i]!.rank) return false;
            }
            return true;
        }).map(e => e.player);
    }

    endHandPrematurely() {
        const winner = this.activePlayers[0];
        if (winner) {
            const startingStacks = new Map<string, number>();
            this.players.forEach(p => {
                startingStacks.set(p.id, p.stack + p.totalContributed);
            });
            
            const total = this.currentPot + this.players.reduce((sum, p) => sum + p.currentBet, 0);
            winner.stack += total;
            this.winners = [winner];
            
            this.lastRoundResults.clear();
            this.players.forEach(p => {
                const startStack = startingStacks.get(p.id) || 0;
                const winAmount = p.stack - startStack;
                this.lastRoundResults.set(p.id, winAmount);
            });
        }
        this.resetToWaiting();
    }
}
