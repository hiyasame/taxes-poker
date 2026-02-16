
import { Game, GameState } from './Game';
import { Player, PlayerStatus } from '../models/Player';
import { GameView, PlayerView } from '../models/Views';
import { HandEvaluator } from './HandEvaluator';

export class Lobby {
    public game: Game;
    private enableIpRestriction: boolean;
    private readonly MAX_PLAYERS = Infinity;
    private readonly MAX_TABLE_SEATS = 12;

    constructor(enableIpRestriction: boolean = false) {
        this.game = new Game();
        this.enableIpRestriction = enableIpRestriction;
    }

    addPlayer(id: string, name: string, stack: number, ip: string = '', username: string = '', password: string = ''): Player | { error: string; existingPlayer?: string } {
        const existing = this.game.players.find(p => p.id === id);
        if (existing) {
            existing.isConnected = true;
            return existing;
        }

        if (this.enableIpRestriction) {
            const sameIpPlayer = this.game.players.find(p => p.ip === ip && p.isConnected);
            if (sameIpPlayer && ip) {
                return { error: 'IP_ALREADY_CONNECTED', existingPlayer: sameIpPlayer.name };
            }
        }

        const disconnectedPlayer = this.game.players.find(p => p.ip === ip && !p.isConnected);
        if (disconnectedPlayer && ip) {
            disconnectedPlayer.id = id;
            disconnectedPlayer.isConnected = true;
            return disconnectedPlayer;
        }

        const connectedCount = this.game.players.filter(p => p.isConnected).length;
        
        const seatedPlayers = this.game.players.filter(p => !p.isSpectator && p.isConnected);
        const seatedCount = seatedPlayers.length;
        const isSpectator = seatedCount >= this.MAX_TABLE_SEATS;

        const isGameInProgress = this.game.state !== GameState.Waiting && this.game.state !== GameState.Finished;
        const shouldBeSpectator = isSpectator || isGameInProgress;
        
        const player = new Player(id, name, stack, shouldBeSpectator, ip, username, password);
        
        if (!shouldBeSpectator) {
            for (let i = 0; i < this.MAX_TABLE_SEATS; i++) {
                if (!seatedPlayers.find(p => p.seatIndex === i)) {
                    player.seatIndex = i;
                    break;
                }
            }
        }
        
        this.game.players.push(player);
        return player;
    }

    takeSeat(playerId: string, seatIndex: number): { success: boolean; message?: string } {
        const player = this.game.players.find(p => p.id === playerId);
        if (!player) {
            return { success: false, message: '玩家不存在' };
        }

        if (this.game.state !== GameState.Waiting) {
            return { success: false, message: '游戏进行中，无法换座' };
        }

        const seatedPlayers = this.game.players.filter(p => !p.isSpectator && p.isConnected);
        
        // 如果是观战者，检查座位是否已满
        if (player.isSpectator && seatedPlayers.length >= this.MAX_TABLE_SEATS) {
            return { success: false, message: '座位已满' };
        }

        if (seatIndex >= 0 && seatIndex < this.MAX_TABLE_SEATS) {
            const occupiedSeat = seatedPlayers.find(p => p.seatIndex === seatIndex && p.id !== playerId);
            if (occupiedSeat) {
                return { success: false, message: '该座位已被占用' };
            }
            player.seatIndex = seatIndex;
        } else {
            // 自动分配座位
            for (let i = 0; i < this.MAX_TABLE_SEATS; i++) {
                if (!seatedPlayers.find(p => p.seatIndex === i)) {
                    player.seatIndex = i;
                    break;
                }
            }
        }

        player.isSpectator = false;
        player.status = PlayerStatus.Active;
        player.isReady = false;
        return { success: true };
    }

    leaveTable(playerId: string): { success: boolean; message?: string } {
        const player = this.game.players.find(p => p.id === playerId);
        if (!player) {
            return { success: false, message: '玩家不存在' };
        }

        if (player.isSpectator) {
            return { success: false, message: '您已经在观战了' };
        }

        if (this.game.state !== GameState.Waiting) {
            return { success: false, message: '游戏进行中，无法离开座位' };
        }

        player.isSpectator = true;
        player.status = PlayerStatus.Spectator;
        player.isReady = false;
        player.seatIndex = -1;
        return { success: true };
    }

    toggleReady(playerId: string): { success: boolean; message?: string } {
        const player = this.game.players.find(p => p.id === playerId);
        if (!player) {
            return { success: false, message: '玩家不存在' };
        }

        if (player.isSpectator) {
            return { success: false, message: '观战者无法准备' };
        }

        if (this.game.state !== GameState.Waiting) {
            return { success: false, message: '游戏进行中' };
        }

        player.isReady = !player.isReady;
        return { success: true };
    }

    removePlayer(id: string) {
        const player = this.game.players.find(p => p.id === id);
        if (player) {
            player.isConnected = false;
        }

        // 如果玩家数 < 2，回到等待状态
        const connectedPlayers = this.game.players.filter(p => p.isConnected && !p.isSpectator);
        if (connectedPlayers.length < 2) {
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

        const playersViews: PlayerView[] = this.game.players
            .filter(p => !p.isSpectator && p.isConnected)
            .sort((a, b) => a.seatIndex - b.seatIndex)
            .map((p) => {
                let handToShow = undefined;
                if (p.id === playerId) {
                    if (p.hasViewedCards || this.game.state === GameState.Showdown) {
                        handToShow = p.hand;
                    }
                } else if (this.game.state === GameState.Showdown) {
                    handToShow = p.hand;
                }
                
                return {
                    id: p.id,
                    name: p.name,
                    stack: p.stack,
                    currentBet: p.currentBet,
                    status: p.status,
                    hand: handToShow,
                    isSelf: p.id === playerId,
                    position: p.seatIndex,
                    isDealer: p.seatIndex === this.game.dealerIndex,
                    isCurrentTurn: p.id === this.game.currentTurnPlayerId &&
                        this.game.state !== GameState.Waiting &&
                        this.game.state !== GameState.Finished &&
                        this.game.state !== GameState.Showdown,
                    lastAction: p.lastAction,
                    totalContributed: p.totalContributed,
                    hasViewedCards: p.hasViewedCards,
                    isReady: p.isReady,
                    seatIndex: p.seatIndex
                };
            });

        const spectatorsViews: PlayerView[] = this.game.players
            .filter(p => p.isSpectator && p.isConnected)
            .map((p) => ({
                id: p.id,
                name: p.name,
                stack: p.stack,
                currentBet: 0,
                status: p.status,
                isSelf: p.id === playerId,
                position: -1,
                isDealer: false,
                isCurrentTurn: false,
                totalContributed: 0,
                hasViewedCards: false,
                isReady: false,
                seatIndex: -1
            }));

        let currentHandType = undefined;
        if (player && player.hand.length > 0 && !player.isSpectator && player.hasViewedCards) {
            const best = HandEvaluator.evaluate([...player.hand, ...this.game.communityCards]);
            currentHandType = HandEvaluator.getRankNameChinese(best.rank);
        }

        const totalPot = this.game.currentPot + this.game.players.reduce((sum, p) => sum + p.currentBet, 0);

        const seatedPlayers = this.game.players.filter(p => !p.isSpectator && p.isConnected);
        const availableSeats: number[] = [];
        for (let i = 0; i < this.MAX_TABLE_SEATS; i++) {
            if (!seatedPlayers.find(p => p.seatIndex === i)) {
                availableSeats.push(i);
            }
        }

        return {
            state: this.game.state,
            communityCards: this.game.communityCards,
            pot: totalPot,
            currentMaxBet: this.game.currentMaxBet,
            players: playersViews,
            spectators: spectatorsViews,
            me: [...playersViews, ...spectatorsViews].find(pv => pv.id === playerId),
            winners: this.game.winners.map(w => w.id),
            currentHandType,
            isSpectator: player?.isSpectator || false,
            totalContributed: player?.totalContributed || 0,
            availableSeats
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
