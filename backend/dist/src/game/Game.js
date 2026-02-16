"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Game = exports.GameState = void 0;
const Deck_1 = require("../models/Deck");
const Player_1 = require("../models/Player");
const HandEvaluator_1 = require("./HandEvaluator");
var GameState;
(function (GameState) {
    GameState["Waiting"] = "WAITING";
    GameState["Preflop"] = "PREFLOP";
    GameState["Flop"] = "FLOP";
    GameState["Turn"] = "TURN";
    GameState["River"] = "RIVER";
    GameState["Showdown"] = "SHOWDOWN";
    GameState["Finished"] = "FINISHED";
})(GameState || (exports.GameState = GameState = {}));
class Game {
    constructor() {
        this.players = [];
        this.communityCards = [];
        this.state = GameState.Waiting;
        this.currentPot = 0;
        this.currentMaxBet = 0;
        this.dealerIndex = 0;
        this.currentTurnIndex = 0;
        this.minBet = 20;
        this.activePlayerCount = 0;
        // Pot tracking
        this.playersActedCount = 0;
        this.winners = [];
        this.deck = new Deck_1.Deck();
    }
    addPlayer(player) {
        if (this.state !== GameState.Waiting) {
            throw new Error("Game in progress");
        }
        this.players.push(player);
    }
    startGame() {
        if (this.players.length < 2)
            throw new Error("Not enough players");
        this.state = GameState.Preflop;
        this.deck.reset();
        this.deck.shuffle();
        this.communityCards = [];
        this.currentPot = 0;
        this.winners = [];
        this.players.forEach(p => {
            p.resetForRound();
            p.lastAction = undefined;
        });
        this.activePlayerCount = this.players.filter(p => p.status !== Player_1.PlayerStatus.SittingOut).length;
        // Deal hole cards
        for (let i = 0; i < 2; i++) {
            this.players.forEach(p => {
                if (p.status === Player_1.PlayerStatus.Active) {
                    const card = this.deck.deal();
                    if (card)
                        p.hand.push(card);
                }
            });
        }
        // Blinds
        let sbIndex, bbIndex;
        if (this.players.length === 2) {
            // Heads-up rules: Dealer is SB, other is BB
            sbIndex = this.dealerIndex;
            bbIndex = (this.dealerIndex + 1) % 2;
        }
        else {
            sbIndex = (this.dealerIndex + 1) % this.players.length;
            bbIndex = (this.dealerIndex + 2) % this.players.length;
        }
        const sbPlayer = this.players[sbIndex];
        const bbPlayer = this.players[bbIndex];
        sbPlayer.bet(Math.min(sbPlayer.stack, this.minBet / 2));
        bbPlayer.bet(Math.min(bbPlayer.stack, this.minBet));
        this.currentMaxBet = this.minBet;
        this.playersActedCount = 0;
        // Start turn: In Heads-up, Dealer acts first. In 3+, player after BB.
        this.currentTurnIndex = (this.players.length === 2) ? sbIndex : (bbIndex + 1) % this.players.length;
    }
    handleAction(playerId, action, amount) {
        const player = this.players[this.currentTurnIndex];
        if (player.id !== playerId)
            throw new Error("Not your turn");
        player.lastAction = { type: action, amount };
        switch (action) {
            case 'fold':
                player.fold();
                this.activePlayerCount--;
                if (this.activePlayerCount === 1) {
                    this.endHandPrematurely();
                    return;
                }
                break;
            case 'check':
                if (player.currentBet < this.currentMaxBet)
                    throw new Error("Cannot check, must call");
                this.playersActedCount++;
                break;
            case 'call':
                const callAmount = this.currentMaxBet - player.currentBet;
                player.bet(Math.min(callAmount, player.stack));
                this.playersActedCount++;
                break;
            case 'raise':
                if (!amount || amount <= this.currentMaxBet)
                    throw new Error("Invalid raise");
                const raiseAmt = amount - player.currentBet;
                if (raiseAmt > player.stack)
                    throw new Error("Not enough chips");
                player.bet(raiseAmt);
                this.currentMaxBet = amount;
                this.playersActedCount = 1; // Reset count, only raiser acted
                break;
            case 'allin':
                player.bet(player.stack);
                if (player.currentBet > this.currentMaxBet) {
                    this.currentMaxBet = player.currentBet;
                    this.playersActedCount = 1;
                }
                else {
                    this.playersActedCount++;
                }
                break;
        }
        // Check if round complete
        const activePlayers = this.players.filter(p => p.status === Player_1.PlayerStatus.Active);
        const allInPlayers = this.players.filter(p => p.status === Player_1.PlayerStatus.AllIn);
        // Round ends if:
        // 1. Only 1 active player left (others all-in or folded). Wait, if others all-in, we still play.
        // 2. Everyone acted AND bets match.
        const allMatched = activePlayers.every(p => p.currentBet === this.currentMaxBet);
        // All-in players might have bet less.
        // Simple logic: everyone active has acted at least once (playersActedCount >= activePlayers.length) AND bets matched.
        // Note: activePlayers changes when someone folds.
        if (allMatched && this.playersActedCount >= activePlayers.length) {
            this.nextStage();
        }
        else {
            this.rotateTurn();
        }
    }
    rotateTurn() {
        let loop = 0;
        do {
            this.currentTurnIndex = (this.currentTurnIndex + 1) % this.players.length;
            loop++;
        } while (this.players[this.currentTurnIndex].status !== Player_1.PlayerStatus.Active &&
            loop < this.players.length);
        // If loop >= length, we might be done or stuck? Check happens in handleAction usually.
    }
    nextStage() {
        // Collect bets
        this.players.forEach(p => {
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
    dealCommunity(n) {
        this.deck.deal(); // Burn
        for (let i = 0; i < n; i++) {
            const c = this.deck.deal();
            if (c)
                this.communityCards.push(c);
        }
    }
    showdown() {
        if (this.state === GameState.Showdown || this.state === GameState.Finished)
            return;
        this.state = GameState.Showdown;
        // Evaluate all remaining players (Active + AllIn)
        const survivors = this.players.filter(p => p.status === Player_1.PlayerStatus.Active || p.status === Player_1.PlayerStatus.AllIn);
        if (survivors.length === 0)
            return; // Should not happen
        let bestHandRank = -1;
        let winners = [];
        this.calculateAndDistributePots();
        this.state = GameState.Finished;
    }
    calculateAndDistributePots() {
        const players = this.players;
        const distinctBets = Array.from(new Set(players.map(p => p.totalContributed)))
            .filter(b => b > 0)
            .sort((a, b) => a - b);
        let previousLevel = 0;
        const pots = [];
        for (const level of distinctBets) {
            const contributionPerPlayer = level - previousLevel;
            const contributors = players.filter(p => p.totalContributed >= level);
            const amount = contributionPerPlayer * contributors.length;
            // Only players who haven't folded are eligible to win a pot
            const eligible = contributors.filter(p => p.status !== Player_1.PlayerStatus.Folded);
            if (amount > 0 && eligible.length > 0) {
                pots.push({ amount, eligible });
            }
            else if (amount > 0 && eligible.length === 0) {
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
            if (winners[0])
                winners[0].stack += remainder;
            this.winners = Array.from(new Set([...this.winners, ...winners]));
        }
    }
    getWinnersAmong(candidates) {
        if (candidates.length === 1)
            return candidates;
        const evaluations = candidates.map(p => ({
            player: p,
            hand: HandEvaluator_1.HandEvaluator.evaluate([...p.hand, ...this.communityCards])
        }));
        evaluations.sort((a, b) => {
            if (a.hand.rank !== b.hand.rank)
                return b.hand.rank - a.hand.rank;
            for (let i = 0; i < 5; i++) {
                if (a.hand.cards[i].rank !== b.hand.cards[i].rank) {
                    return b.hand.cards[i].rank - a.hand.cards[i].rank;
                }
            }
            return 0;
        });
        const best = evaluations[0];
        return evaluations.filter(e => {
            if (e.hand.rank !== best.hand.rank)
                return false;
            for (let i = 0; i < 5; i++) {
                if (e.hand.cards[i].rank !== best.hand.cards[i].rank)
                    return false;
            }
            return true;
        }).map(e => e.player);
    }
    endHandPrematurely() {
        const winner = this.players.find(p => p.status !== Player_1.PlayerStatus.Folded);
        if (winner) {
            // Give all money currently in pot + pending bets
            const total = this.currentPot + this.players.reduce((sum, p) => sum + p.currentBet, 0);
            winner.stack += total;
            this.winners = [winner];
        }
        this.state = GameState.Finished;
    }
}
exports.Game = Game;
