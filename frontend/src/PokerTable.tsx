
import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { GameState } from './types';
import type { GameView } from './types';
import { Player } from './components/Player';
import { EmptySeat } from './components/EmptySeat';
import { Card } from './components/Card';
import { Users, Bell, Coins, X } from 'lucide-react';
import './App.css';

// const SOCKET_URL = `http://${window.location.hostname}:3001`; // 本地测试
const SOCKET_URL = undefined; // 上线使用

const socket: Socket = io(SOCKET_URL, {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10
});

const PokerTable: React.FC = () => {
    const [game, setGame] = useState<GameView | null>(null);
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [joined, setJoined] = useState(false);
    const [showRaiseUI, setShowRaiseUI] = useState(false);
    const [raiseAmount, setRaiseAmount] = useState(0);
    const [notification, setNotification] = useState<{ message: string, type: 'info' | 'alert' } | null>(null);
    const [joinError, setJoinError] = useState<string>('');
    const [isConnected, setIsConnected] = useState(false);
    const [waitingReconnect, setWaitingReconnect] = useState<{ playerName: string; countdown: number } | null>(null);
    const [viewHandRequest, setViewHandRequest] = useState<{ requesterId: string; requesterName: string } | null>(null);
    const lastStateRef = useRef<GameView | null>(null);
    const loginCredentials = useRef<{ username: string; password: string } | null>(null);
    const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // 加载保存的账号密码
    useEffect(() => {
        const savedUsername = localStorage.getItem('poker_username');
        const savedPassword = localStorage.getItem('poker_password');
        if (savedUsername && savedPassword) {
            setName(savedUsername);
            setPassword(savedPassword);
        }
    }, []);

    const notify = (message: string, type: 'info' | 'alert' = 'info') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 4000);
    };

    useEffect(() => {
        const handleConnect = () => {
            console.log('Socket connected');
            setIsConnected(true);
            if (loginCredentials.current && joined) {
                console.log('Reconnecting with credentials:', loginCredentials.current.username);
                socket.emit('login', loginCredentials.current);
            }
        };

        const handleDisconnect = () => {
            console.log('Socket disconnected');
            setIsConnected(false);
            notify('连接已断开，正在重连...', 'alert');
        };

        const handleState = (state: GameView) => {
            if (!joined) {
                setJoined(true);
                setJoinError('');
            }

            if (lastStateRef.current) {
                const prevGame = lastStateRef.current;

                state.players.forEach(p => {
                    const prevP = prevGame.players.find(old => old.id === p.id);
                    if (prevP && p.lastAction && JSON.stringify(p.lastAction) !== JSON.stringify(prevP.lastAction)) {
                        const actionMap: Record<string, string> = {
                            fold: '弃牌', check: '过牌', call: '跟注', raise: '加注', allin: '全下'
                        };
                        const actName = actionMap[p.lastAction.type] || p.lastAction.type;
                        const amtStr = p.lastAction.amount ? ` $${p.lastAction.amount}` : '';
                        notify(`${p.name} ${actName}${amtStr}`);
                    }
                });

                const currentTurnPlayer = state.players.find(p => p.isCurrentTurn);
                const prevTurnPlayer = prevGame.players.find(p => p.isCurrentTurn);
                if (currentTurnPlayer && currentTurnPlayer.id !== prevTurnPlayer?.id) {
                    if (currentTurnPlayer.isSelf) {
                        const callAmt = state.currentMaxBet - (currentTurnPlayer.currentBet || 0);
                        notify(`轮到你了！最少需跟注 $${callAmt}`, 'alert');
                    } else {
                        notify(`等待 ${currentTurnPlayer.name} 行动...`);
                    }
                }
            }

            setGame(state);
            lastStateRef.current = state;
        };

        const handleError = (msg: string | { type: string; message: string }) => {
            if (typeof msg === 'object' && (msg.type === 'IP_ALREADY_CONNECTED' || msg.type === 'LOGIN_FAILED' || msg.type === 'ROOM_FULL')) {
                setJoinError(msg.message);
                setJoined(false);
                notify(msg.message, 'alert');
            } else {
                const errorMsg = typeof msg === 'string' ? msg : msg.message;
                notify(errorMsg, 'alert');
            }
        };

        const handlePlayerLeft = (data: { playerName: string; message: string }) => {
            notify(data.message, 'alert');
            setWaitingReconnect(null);
            if (countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current);
                countdownIntervalRef.current = null;
            }
        };

        const handleWaitingForReconnect = (data: { playerName: string; message: string; countdown: number }) => {
            notify(data.message, 'alert');
            setWaitingReconnect({ playerName: data.playerName, countdown: data.countdown });
            
            // 启动倒计时
            let timeLeft = data.countdown;
            if (countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current);
            }
            countdownIntervalRef.current = setInterval(() => {
                timeLeft -= 1;
                setWaitingReconnect(prev => prev ? { ...prev, countdown: timeLeft } : null);
                if (timeLeft <= 0 && countdownIntervalRef.current) {
                    clearInterval(countdownIntervalRef.current);
                    countdownIntervalRef.current = null;
                }
            }, 1000);
        };

        const handleAdditionalPlayerLeft = (data: { playerName: string; message: string }) => {
            notify(data.message, 'alert');
            // 不改变倒计时，继续等待
        };

        const handleAllPlayersReconnected = (data: { message: string }) => {
            notify(data.message, 'info');
            setWaitingReconnect(null);
            if (countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current);
                countdownIntervalRef.current = null;
            }
        };

        const handlePlayerReconnected = (data: { playerName: string; message: string }) => {
            notify(data.message, 'info');
        };

        const handleViewHandRequest = (data: { requesterId: string; requesterName: string }) => {
            console.log('Received viewHandRequest:', data);
            console.log('Current viewHandRequest state:', viewHandRequest);
            setViewHandRequest(data);
            notify(`${data.requesterName} 想要查看你的手牌`, 'alert');
        };

        const handleViewHandApproved = (data: { targetId: string; targetName: string }) => {
            notify(`${data.targetName} 同意了你的查看请求`, 'info');
        };

        const handleViewHandDenied = (data: { targetId: string; targetName: string }) => {
            notify(`${data.targetName} 拒绝了你的查看请求`, 'info');
        };

        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);
        socket.on('state', handleState);
        socket.on('error', handleError);
        socket.on('playerLeft', handlePlayerLeft);
        socket.on('waitingForReconnect', handleWaitingForReconnect);
        socket.on('additionalPlayerLeft', handleAdditionalPlayerLeft);
        socket.on('playerReconnected', handlePlayerReconnected);
        socket.on('allPlayersReconnected', handleAllPlayersReconnected);
        socket.on('viewHandRequest', handleViewHandRequest);
        socket.on('viewHandApproved', handleViewHandApproved);
        socket.on('viewHandDenied', handleViewHandDenied);

        return () => {
            socket.off('connect', handleConnect);
            socket.off('disconnect', handleDisconnect);
            socket.off('state', handleState);
            socket.off('error', handleError);
            socket.off('playerLeft', handlePlayerLeft);
            socket.off('waitingForReconnect', handleWaitingForReconnect);
            socket.off('additionalPlayerLeft', handleAdditionalPlayerLeft);
            socket.off('playerReconnected', handlePlayerReconnected);
            socket.off('allPlayersReconnected', handleAllPlayersReconnected);
            socket.off('viewHandRequest', handleViewHandRequest);
            socket.off('viewHandApproved', handleViewHandApproved);
            socket.off('viewHandDenied', handleViewHandDenied);
            
            if (countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current);
            }
        };
    }, [joined]);

    const handleJoin = () => {
        if (name && password) {
            setJoinError('');
            loginCredentials.current = { username: name, password };
            
            // 保存账号密码到 localStorage
            localStorage.setItem('poker_username', name);
            localStorage.setItem('poker_password', password);
            
            socket.emit('login', { username: name, password });
        }
    };

    const handleAction = (type: string, amount?: number) => {
        socket.emit('action', { type, amount });
        setShowRaiseUI(false);
    };

    const handleStart = () => {
        socket.emit('startGame');
    };

    const handleViewCards = () => {
        socket.emit('viewCards');
    };

    const handleToggleReady = () => {
        socket.emit('toggleReady');
    };

    const handleChangeSeat = (newSeatIndex: number) => {
        socket.emit('takeSeat', newSeatIndex);
    };

    const handleLeaveTable = () => {
        socket.emit('leaveTable');
    };

    const handleRequestViewHand = (targetPlayerId: string) => {
        console.log('Requesting to view hand of:', targetPlayerId);
        if (game?.state === GameState.Waiting) {
            socket.emit('requestViewHand', targetPlayerId);
            notify('已发送查看手牌请求', 'info');
        } else {
            console.log('Game state is not Waiting:', game?.state);
        }
    };

    const handleApproveViewRequest = () => {
        if (viewHandRequest) {
            socket.emit('approveViewRequest', viewHandRequest.requesterId);
            notify(`已同意 ${viewHandRequest.requesterName} 的查看请求`, 'info');
            setViewHandRequest(null);
        }
    };

    const handleDenyViewRequest = () => {
        if (viewHandRequest) {
            socket.emit('denyViewRequest', viewHandRequest.requesterId);
            notify(`已拒绝 ${viewHandRequest.requesterName} 的查看请求`, 'info');
            setViewHandRequest(null);
        }
    };

    const getPlayerAtSeat = (seatIndex: number) => {
        if (!game) return null;
        return game.players.find(p => p.seatIndex === seatIndex);
    };

    const canTakeSeat = () => {
        return game?.state === GameState.Waiting;
    };


    if (!joined) {
        return (
            <div id="mobile-container" className="flex items-center justify-center">
                <div className="glass login-panel">
                    <h1 className="login-title">联机德州扑克</h1>
                    {joinError && (
                        <div className="login-error">
                            {joinError}
                        </div>
                    )}
                    <input
                        type="text"
                        placeholder="账号（用户名）"
                        className="login-input"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                    <input
                        type="password"
                        placeholder="密码"
                        className="login-input"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                        onClick={handleJoin}
                        className="login-button"
                    >
                        登录 / 注册
                    </button>
                    <div className="login-hint">
                        首次登录自动注册 · 财产自动保存
                    </div>
                </div>
            </div>
        );
    }

    if (!game) return <div className="text-white flex items-center justify-center h-full">正在连接服务器...</div>;

    const hero = game.me;
    const minRaise = game.currentMaxBet || 10;
    const maxRaise = hero?.stack || 0;

    return (
        <div id="mobile-container" className="relative overflow-hidden">
            {/* 查看手牌请求弹窗 */}
            {viewHandRequest && (
                <div className="modal-overlay">
                    <div className="glass view-hand-modal-content">
                        <div className="view-hand-icon">👀</div>
                        <div className="view-hand-title">
                            查看手牌请求
                        </div>
                        <div className="view-hand-message">
                            <span className="view-hand-requester">{viewHandRequest.requesterName}</span> 想要查看你的手牌
                        </div>
                        <div className="view-hand-buttons">
                            <button
                                onClick={handleDenyViewRequest}
                                className="view-hand-deny-button"
                            >
                                拒绝
                            </button>
                            <button
                                onClick={handleApproveViewRequest}
                                className="view-hand-approve-button"
                            >
                                同意
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 等待重连遮罩 */}
            {waitingReconnect && (
                <div className="reconnect-overlay">
                    <div className="glass reconnect-modal-content">
                        <div className="reconnect-icon">⏳</div>
                        <div className="reconnect-title">
                            等待 {waitingReconnect.playerName} 重连
                        </div>
                        <div className="reconnect-countdown">
                            {waitingReconnect.countdown}s
                        </div>
                        <div className="reconnect-message">
                            游戏已暂停,请等待玩家重新连接...
                        </div>
                    </div>
                </div>
            )}
            
            {!isConnected && (
                <div className="glass connection-status">
                    <div className="connection-status-inner">
                        🔴 重连中...
                    </div>
                </div>
            )}

            {notification && (
                <div className={`notification-toast ${notification.type === 'alert' ? 'turn-alert' : ''}`}>
                    <Bell size={14} className="mr-2" />
                    {notification.message}
                </div>
            )}

            {game.isSpectator && (
                <div className="glass spectator-badge">
                    <div className="spectator-badge-inner">
                        <Users size={14} />
                        观战中 - 本局结束后加入
                    </div>
                </div>
            )}

            <div className="poker-table">
                <div className="poker-felt-texture" />

                {/* 当前操作玩家提示 */}
                {game.state !== GameState.Waiting && (() => {
                    const currentPlayer = game.players.find(p => p.isCurrentTurn);
                    if (currentPlayer) {
                        const callAmount = game.currentMaxBet - (currentPlayer.currentBet || 0);
                        return (
                            <div className="glass current-player-indicator">
                                <div className="current-player-text">
                                    {currentPlayer.isSelf
                                        ? (callAmount > 0
                                            ? `等待您操作... (需跟注 $${callAmount})`
                                            : '等待您操作...')
                                        : `等待 ${currentPlayer.name} 操作...`}
                                </div>
                            </div>
                        );
                    }
                })()}

                <div className="pot-pos text-center w-full scale-75">
                    <span className="pot-header">TOTAL POT</span>
                    <div className="pot-amount">
                        <div className="pot-icon">
                            <Coins size={10} className="text-yellow-900" />
                        </div>
                        ${game.pot}
                    </div>
                </div>

                <div className="community-cards-pos flex gap-1-5">
                    {[0, 1, 2, 3, 4].map(i => (
                        game.communityCards[i] ? (
                            <Card key={i} card={game.communityCards[i]} />
                        ) : (
                            <div key={i} className="community-card-slot" />
                        )
                    ))}
                </div>

                {/* 上一局结算信息 */}
                {game.state === GameState.Waiting && game.lastRoundResults && game.lastRoundResults.length > 0 && (
                    <div className="settlement-info-pos">
                        <div className="glass rounded-xl p-3 border border-white/20">
                            <div className="settlement-header">
                                上局结算
                            </div>
                            <div className="settlement-list">
                                {game.lastRoundResults.map((result) => (
                                    <div key={result.playerId} className="settlement-item">
                                        <span className="settlement-player-name">
                                            {result.playerName}
                                        </span>
                                        <span className={
                                            result.winAmount > 0
                                                ? 'settlement-amount-win'
                                                : result.winAmount < 0
                                                ? 'settlement-amount-lose'
                                                : 'settlement-amount-neutral'
                                        }>
                                            {result.winAmount > 0 ? '+' : ''}{result.winAmount}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                <div className="absolute inset-0 pointer-events-none">
                    {/* 12个座位时钟式布局 - 相对视角 */}
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(visualSeat => {
                        // 计算这个视觉位置对应的实际座位索引
                        const actualSeat = hero && !hero.isSpectator 
                            ? (visualSeat - (6 - hero.seatIndex) + 12) % 12 
                            : visualSeat;
                        const player = getPlayerAtSeat(actualSeat);
                        
                        return (
                            <div key={visualSeat} className={`seat-${visualSeat}`}>
                                {player ? (
                                    <Player 
                                        player={player} 
                                        onViewCards={player.isSelf ? handleViewCards : undefined}
                                        onRequestViewHand={!player.isSelf ? handleRequestViewHand : undefined}
                                        gameState={game.state} 
                                    />
                                ) : (
                                    game.state === GameState.Waiting && (
                                        <EmptySeat 
                                            seatIndex={actualSeat} 
                                            canTakeSeat={canTakeSeat()} 
                                            onTakeSeat={handleChangeSeat} 
                                        />
                                    )
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className={`glass action-bar ${showRaiseUI ? 'disabled' : ''}`}>
                {game.isSpectator ? (
                    <div className="spectator-display">
                        <div className="spectator-title">👁️ 观战模式</div>
                        <div className="spectator-stats">
                            在线: {game.players.length + game.spectators.length} 人 | 座位: {game.players.length}/{12} | 观战: {game.spectators.length}
                        </div>
                        <div className="spectator-hint">
                            {game.state !== GameState.Waiting ? '游戏进行中，请等待本局结束' : '点击空座位入座'}
                        </div>
                    </div>
                ) : game.state !== GameState.Waiting ? (
                    <>
                        <div className="hand-info-bar">
                            <span className="hand-info-item">
                                手牌: <span className="hand-info-value">
                                    {hero?.hasViewedCards ? (game.currentHandType || '等待中') : '未查看'}
                                </span>
                            </span>
                            <span className="hand-info-item">
                                当前注: <span className="current-bet-value">${hero?.currentBet || 0}</span>
                            </span>
                        </div>
                        <div className="action-buttons-grid">
                            <button
                                onClick={() => handleAction('fold')}
                                className="action-button action-button-fold"
                            >
                                弃牌
                            </button>
                            <button
                                onClick={() => handleAction(game.currentMaxBet === (hero?.currentBet || 0) ? 'check' : 'call')}
                                className="action-button action-button-check-call"
                            >
                                {game.currentMaxBet === (hero?.currentBet || 0) ? '过牌' : '跟注'}
                            </button>
                            <button
                                onClick={() => {
                                    setRaiseAmount(Math.max(minRaise, game.currentMaxBet + 10));
                                    setShowRaiseUI(true);
                                }}
                                className="action-button action-button-raise"
                            >
                                加注
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="waiting-room">
                        <div className="online-stats">
                            <Users size={12} /> 在线: {game.players.length + game.spectators.length} | 座位: {game.players.length}/{12} | 观战: {game.spectators.length} | 准备: {game.players.filter(p => p.isReady).length}/{game.players.length}
                        </div>
                        
                        <div className="waiting-room-all-buttons">
                            <button
                                onClick={handleToggleReady}
                                className={`ready-button ${
                                    hero?.isReady 
                                        ? 'ready-button-active' 
                                        : 'ready-button-inactive'
                                }`}
                            >
                                {hero?.isReady ? '✓ 已准备' : '准备'}
                            </button>
                            <button
                                onClick={handleStart}
                                disabled={game.players.filter(p => !p.isSpectator && !p.isReady).length !== 0}
                                className={`start-game-button ${
                                    game.players.filter(p => !p.isSpectator && !p.isReady).length === 0
                                        ? 'start-game-button-enabled'
                                        : 'start-game-button-disabled'
                                }`}
                            >
                                开始游戏
                            </button>
                            <button
                                onClick={handleLeaveTable}
                                className="leave-table-button"
                            >
                                去观战
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {showRaiseUI && (
                <div className="raise-ui-overlay">
                    <div className="raise-ui-header">
                        <span className="raise-ui-title">
                            <Coins size={16} /> 加注金额
                        </span>
                        <button onClick={() => setShowRaiseUI(false)} className="raise-ui-close">
                            <X size={18} />
                        </button>
                    </div>

                    <div className="raise-amount-display">
                        ${raiseAmount}
                    </div>

                    <div className="raise-amount-controls">
                        <button
                            className="raise-control-button"
                            onClick={() => setRaiseAmount(Math.max(minRaise, raiseAmount - 10))}
                        >
                            -
                        </button>
                        <div className="raise-slider-container">
                            <input
                                type="range"
                                min={minRaise}
                                max={maxRaise}
                                step={10}
                                value={raiseAmount}
                                onChange={(e) => setRaiseAmount(parseInt(e.target.value))}
                                className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                            />
                            <div className="raise-slider-labels">
                                <span>MIN ${minRaise}</span>
                                <span>MAX ${maxRaise}</span>
                            </div>
                        </div>
                        <button
                            className="raise-control-button"
                            onClick={() => setRaiseAmount(Math.min(maxRaise, raiseAmount + 10))}
                        >
                            +
                        </button>
                    </div>

                    <div className="raise-action-buttons">
                        <button
                            onClick={() => setRaiseAmount(maxRaise)}
                            className="raise-allin-button"
                        >
                            ALL IN!
                        </button>
                        <button
                            onClick={() => handleAction('raise', raiseAmount)}
                            className="raise-confirm-button"
                        >
                            确认加注
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PokerTable;
