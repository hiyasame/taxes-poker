"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Lobby = void 0;
const Game_1 = require("./Game");
const Player_1 = require("../models/Player");
const HandEvaluator_1 = require("./HandEvaluator");
class Lobby {
    constructor() {
        this.game = new Game_1.Game();
    }
    addPlayer(id, name, stack) {
        const existing = this.game.players.find(p => p.id === id);
        if (existing)
            return existing;
        const player = new Player_1.Player(id, name, stack);
        this.game.addPlayer(player);
        return player;
    }
    removePlayer(id) {
        const index = this.game.players.findIndex(p => p.id === id);
        if (index !== -1) {
            this.game.players.splice(index, 1);
        }
        // Rule: If player count < 2, fallback to waiting
        if (this.game.players.length < 2) {
            this.game.state = Game_1.GameState.Waiting;
            this.resetGameData();
        }
    }
    resetGameData() {
        this.game.communityCards = [];
        this.game.currentPot = 0;
        this.game.currentMaxBet = 0;
        this.game.winners = [];
        this.game.players.forEach(p => {
            p.hand = [];
            p.currentBet = 0;
            p.totalBetThisRound = 0;
            if (p.stack > 0)
                p.status = Player_1.PlayerStatus.Active;
        });
    }
    getGameView(playerId) {
        const player = this.game.players.find(p => p.id === playerId);
        const playersViews = this.game.players.map((p, index) => ({
            id: p.id,
            name: p.name,
            stack: p.stack,
            currentBet: p.currentBet,
            status: p.status,
            hand: (p.id === playerId || this.game.state === Game_1.GameState.Showdown) ? p.hand : undefined, // Security: Only show all in showdown
            isSelf: p.id === playerId,
            position: index,
            isDealer: index === this.game.dealerIndex,
            isCurrentTurn: index === this.game.currentTurnIndex &&
                this.game.state !== Game_1.GameState.Waiting &&
                this.game.state !== Game_1.GameState.Finished &&
                this.game.state !== Game_1.GameState.Showdown,
            lastAction: p.lastAction,
            totalContributed: p.totalContributed
        }));
        let currentHandType = undefined;
        if (player && player.hand.length > 0) {
            // Infer current hand type from hole cards + visible community cards
            const best = HandEvaluator_1.HandEvaluator.evaluate([...player.hand, ...this.game.communityCards]);
            currentHandType = HandEvaluator_1.HandEvaluator.getRankNameChinese(best.rank);
        }
        const totalPot = this.game.currentPot + this.game.players.reduce((sum, p) => sum + p.currentBet, 0);
        return {
            state: this.game.state,
            communityCards: this.game.communityCards,
            pot: totalPot,
            currentMaxBet: this.game.currentMaxBet,
            players: playersViews,
            me: playersViews.find(pv => pv.id === playerId),
            winners: this.game.winners.map(w => w.id),
            currentHandType
        };
    }
    // Proxy for starting the game
    startGame() {
        this.game.startGame();
    }
    // Proxy for player actions
    handleAction(playerId, action, amount) {
        this.game.handleAction(playerId, action, amount);
    }
}
exports.Lobby = Lobby;
