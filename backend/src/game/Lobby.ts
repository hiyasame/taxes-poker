
import { Game, GameState } from './Game';
import { Player, PlayerStatus } from '../models/Player';
import { GameView, PlayerView } from '../models/Views';
import { HandEvaluator } from './HandEvaluator';

export class Lobby {
    public game: Game;

    constructor() {
        this.game = new Game();
    }

    addPlayer(id: string, name: string, stack: number): Player {
        const existing = this.game.players.find(p => p.id === id);
        if (existing) return existing;

        const player = new Player(id, name, stack);
        this.game.addPlayer(player);
        return player;
    }

    removePlayer(id: string) {
        const index = this.game.players.findIndex(p => p.id === id);
        if (index !== -1) {
            this.game.players.splice(index, 1);
        }

        // Rule: If player count < 2, fallback to waiting
        if (this.game.players.length < 2) {
            this.game.state = GameState.Waiting;
            this.resetGameData();
        }
    }

    private resetGameData() {
        this.game.communityCards = [];
        this.game.currentPot = 0;
        this.game.currentMaxBet = 0;
        this.game.winners = [];
        this.game.players.forEach(p => {
            p.hand = [];
            p.currentBet = 0;
            p.totalBetThisRound = 0;
            if (p.stack > 0) p.status = PlayerStatus.Active;
        });
    }

    getGameView(playerId: string): GameView {
        const player = this.game.players.find(p => p.id === playerId);

        const playersViews: PlayerView[] = this.game.players.map((p, index) => ({
            id: p.id,
            name: p.name,
            stack: p.stack,
            currentBet: p.currentBet,
            status: p.status,
            hand: (p.id === playerId || this.game.state === GameState.Showdown) ? p.hand : undefined, // Security: Only show all in showdown
            isSelf: p.id === playerId,
            position: index,
            isDealer: index === this.game.dealerIndex,
            isCurrentTurn: index === this.game.currentTurnIndex &&
                this.game.state !== GameState.Waiting &&
                this.game.state !== GameState.Finished &&
                this.game.state !== GameState.Showdown,
            lastAction: p.lastAction,
            totalContributed: p.totalContributed
        }));

        let currentHandType = undefined;
        if (player && player.hand.length > 0) {
            // Infer current hand type from hole cards + visible community cards
            const best = HandEvaluator.evaluate([...player.hand, ...this.game.communityCards]);
            currentHandType = HandEvaluator.getRankNameChinese(best.rank);
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
    handleAction(playerId: string, action: 'fold' | 'check' | 'call' | 'raise' | 'allin', amount?: number) {
        this.game.handleAction(playerId, action, amount);
    }
}
