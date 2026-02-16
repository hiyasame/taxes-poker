
import { Game, GameState } from './Game';
import { Player, PlayerStatus } from '../models/Player';
import { GameView, PlayerView } from '../models/Views';
import { HandEvaluator } from './HandEvaluator';

export class Lobby {
    public game: Game;
    private enableIpRestriction: boolean;
    private readonly MAX_PLAYERS = Infinity;
    private readonly MAX_TABLE_SEATS = 12;
    private disconnectTimer: NodeJS.Timeout | null = null;
    private disconnectedPlayers: Set<string> = new Set();
    public isPaused: boolean = false;
    private viewRequestsMap: Map<string, Set<string>> = new Map();

    constructor(enableIpRestriction: boolean = false) {
        this.game = new Game();
        this.enableIpRestriction = enableIpRestriction;
    }

    addPlayer(id: string, name: string, stack: number, ip: string = '', username: string = '', password: string = ''): Player | { error: string; existingPlayer?: string } | { player: Player; allReconnected: boolean } {
        const existing = this.game.players.find(p => p.id === id);
        if (existing) {
            existing.isConnected = true;
            
            // 如果是等待重连的玩家，从掉线列表中移除
            const wasDisconnected = this.disconnectedPlayers.has(id);
            console.log(`Player ${name} reconnecting. Was disconnected: ${wasDisconnected}, Disconnected count before: ${this.disconnectedPlayers.size}`);
            
            if (wasDisconnected) {
                this.disconnectedPlayers.delete(id);
                console.log(`Disconnected count after removing: ${this.disconnectedPlayers.size}, isPaused: ${this.isPaused}`);
                
                // 如果所有掉线的玩家都重连了，取消暂停
                if (this.disconnectedPlayers.size === 0 && this.isPaused) {
                    console.log('All players reconnected! Clearing timer and resuming game');
                    if (this.disconnectTimer) {
                        clearTimeout(this.disconnectTimer);
                        this.disconnectTimer = null;
                        console.log('Timer cleared');
                    }
                    this.isPaused = false;
                    
                    return { player: existing, allReconnected: true };
                }
            }
            
            return existing;
        }

        if (this.enableIpRestriction) {
            const sameIpPlayer = this.game.players.find(p => p.ip === ip && p.isConnected);
            if (sameIpPlayer && ip) {
                return { error: 'IP_ALREADY_CONNECTED', existingPlayer: sameIpPlayer.name };
            }
        }

        // 通过用户名查找掉线的玩家（更可靠）
        const disconnectedPlayer = this.game.players.find(p => p.username === username && !p.isConnected);
        if (disconnectedPlayer && username) {
            const oldId = disconnectedPlayer.id;
            disconnectedPlayer.id = id;
            disconnectedPlayer.isConnected = true;
            
            // 检查是否在掉线列表中（使用旧ID）
            const wasDisconnected = this.disconnectedPlayers.has(oldId);
            console.log(`Player ${name} reconnecting via username. Was disconnected: ${wasDisconnected}, Disconnected count before: ${this.disconnectedPlayers.size}`);
            
            if (wasDisconnected) {
                this.disconnectedPlayers.delete(oldId);
                console.log(`Disconnected count after removing: ${this.disconnectedPlayers.size}, isPaused: ${this.isPaused}`);
                
                // 如果所有掉线的玩家都重连了，取消暂停
                if (this.disconnectedPlayers.size === 0 && this.isPaused) {
                    console.log('All players reconnected! Clearing timer and resuming game');
                    if (this.disconnectTimer) {
                        clearTimeout(this.disconnectTimer);
                        this.disconnectTimer = null;
                        console.log('Timer cleared');
                    }
                    this.isPaused = false;
                    
                    return { player: disconnectedPlayer, allReconnected: true };
                }
            }
            
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

    removePlayer(id: string): { shouldWait: boolean; playerName?: string; isAlreadyWaiting?: boolean } {
        const player = this.game.players.find(p => p.id === id);
        if (player) {
            player.isConnected = false;
        }

        // 如果游戏进行中且有人退出，启动10秒倒计时
        const connectedPlayers = this.game.players.filter(p => p.isConnected && !p.isSpectator);
        const isGameInProgress = this.game.state !== GameState.Waiting && this.game.state !== GameState.Finished;
        
        if (isGameInProgress && player && !player.isSpectator) {
            // 添加到掉线玩家列表
            this.disconnectedPlayers.add(id);
            
            // 如果已经在等待中，不重置倒计时
            if (this.isPaused) {
                return { shouldWait: true, playerName: player.name, isAlreadyWaiting: true };
            }
            
            // 暂停游戏，等待玩家重连
            this.isPaused = true;
            
            return { shouldWait: true, playerName: player.name, isAlreadyWaiting: false };
        }
        
        // 如果玩家数 < 2，回到等待状态
        if (connectedPlayers.length < 2) {
            this.game.state = GameState.Waiting;
            this.resetGameData();
        }
        
        return { shouldWait: false };
    }

    cancelGame(): void {
        // 退还所有玩家的当前下注
        this.game.players.forEach(p => {
            p.stack += p.currentBet;
            p.currentBet = 0;
        });
        
        // 退还底池
        const totalPotToRefund = this.game.currentPot;
        if (totalPotToRefund > 0) {
            this.game.players.forEach(p => {
                if (p.totalBetThisRound > 0) {
                    p.stack += p.totalBetThisRound;
                    p.totalBetThisRound = 0;
                }
            });
        }
        
        this.game.state = GameState.Waiting;
        this.resetGameData();
        this.isPaused = false;
        this.disconnectedPlayers.clear(); // 清空掉线列表
        
        if (this.disconnectTimer) {
            clearTimeout(this.disconnectTimer);
            this.disconnectTimer = null;
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
                    handToShow = p.hand;
                } else if (p.allowedViewers.has(playerId) && this.game.state === GameState.Waiting) {
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

        const lastRoundResults = Array.from(this.game.lastRoundResults.entries()).map(([playerId, winAmount]) => {
            const p = this.game.players.find(player => player.id === playerId);
            return {
                playerId,
                playerName: p?.name || '未知玩家',
                winAmount
            };
        }).filter(r => r.winAmount !== 0);

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
            availableSeats,
            lastRoundResults: lastRoundResults.length > 0 ? lastRoundResults : undefined
        };
    }

    // Proxy for starting the game
    startGame() {
        if (this.isPaused) {
            throw new Error('游戏已暂停，等待玩家重连');
        }
        this.game.startGame();
    }

    // Proxy for player actions
    handleAction(playerId: string, action: 'fold' | 'check' | 'call' | 'raise' | 'allin', amount?: number) {
        if (this.isPaused) {
            throw new Error('游戏已暂停，等待玩家重连');
        }
        this.game.handleAction(playerId, action, amount);
    }

    requestViewHand(requesterId: string, targetPlayerId: string): { success: boolean; message?: string } {
        if (this.game.state !== GameState.Waiting) {
            return { success: false, message: '只能在游戏结束后请求查看手牌' };
        }

        const requester = this.game.players.find(p => p.id === requesterId);
        const target = this.game.players.find(p => p.id === targetPlayerId);

        if (!requester || !target) {
            return { success: false, message: '玩家不存在' };
        }

        if (requesterId === targetPlayerId) {
            return { success: false, message: '不能请求查看自己的手牌' };
        }

        if (!this.viewRequestsMap.has(targetPlayerId)) {
            this.viewRequestsMap.set(targetPlayerId, new Set());
        }

        this.viewRequestsMap.get(targetPlayerId)!.add(requesterId);

        return { success: true };
    }

    approveViewRequest(targetPlayerId: string, requesterId: string): { success: boolean; message?: string } {
        const target = this.game.players.find(p => p.id === targetPlayerId);
        const requester = this.game.players.find(p => p.id === requesterId);

        if (!target || !requester) {
            return { success: false, message: '玩家不存在' };
        }

        const requests = this.viewRequestsMap.get(targetPlayerId);
        if (!requests || !requests.has(requesterId)) {
            return { success: false, message: '没有待处理的请求' };
        }

        target.allowedViewers.add(requesterId);
        requests.delete(requesterId);

        return { success: true };
    }

    denyViewRequest(targetPlayerId: string, requesterId: string): { success: boolean; message?: string } {
        const requests = this.viewRequestsMap.get(targetPlayerId);
        if (!requests || !requests.has(requesterId)) {
            return { success: false, message: '没有待处理的请求' };
        }

        requests.delete(requesterId);

        return { success: true };
    }

    getPendingViewRequests(playerId: string): string[] {
        const requests = this.viewRequestsMap.get(playerId);
        if (!requests) return [];
        return Array.from(requests);
    }
}
