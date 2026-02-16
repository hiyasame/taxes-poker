
import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { GameState } from './types';
import type { GameView } from './types';
import { Player } from './components/Player';
import { EmptySeat } from './components/EmptySeat';
import { Card } from './components/Card';
import { Users, Bell, Coins, X } from 'lucide-react';
import './App.css';

const socket: Socket = io('http://localhost:3001', {
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
    const lastStateRef = useRef<GameView | null>(null);
    const loginCredentials = useRef<{ username: string; password: string } | null>(null);

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

        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);
        socket.on('state', handleState);
        socket.on('error', handleError);

        return () => {
            socket.off('connect', handleConnect);
            socket.off('disconnect', handleDisconnect);
            socket.off('state', handleState);
            socket.off('error', handleError);
        };
    }, [joined]);

    const handleJoin = () => {
        if (name && password) {
            setJoinError('');
            loginCredentials.current = { username: name, password };
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
                <div className="glass p-8 m-4 w-full max-w-xs text-center animate-zoom-in">
                    <h1 className="text-2xl font-black text-yellow-500 mb-6 font-outfit">联机德州扑克</h1>
                    {joinError && (
                        <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-xl text-red-400 text-sm">
                            {joinError}
                        </div>
                    )}
                    <input
                        type="text"
                        placeholder="账号（用户名）"
                        className="w-full p-3 rounded-xl bg-white/10 border border-white/20 text-white mb-3 outline-none focus:border-yellow-500"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                    <input
                        type="password"
                        placeholder="密码"
                        className="w-full p-3 rounded-xl bg-white/10 border border-white/20 text-white mb-4 outline-none focus:border-yellow-500"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                        onClick={handleJoin}
                        className="w-full py-4 bg-yellow-500 text-black font-black rounded-xl shadow-lg active:scale-95 transition-all outline-none"
                    >
                        登录 / 注册
                    </button>
                    <div className="mt-3 text-xs text-white/40">
                        首次登录自动注册 · 财产自动保存
                    </div>
                </div>
            </div>
        );
    }

    if (!game) return <div className="text-white flex items-center justify-center h-full">正在连接服务器...</div>;

    const hero = game.me;
    const minRaise = game.currentMaxBet * 2 || 40;
    const maxRaise = hero?.stack || 0;

    return (
        <div id="mobile-container" className="relative overflow-hidden">
            {!isConnected && (
                <div className="absolute top-2 right-2 z-50 glass px-3 py-1 rounded-full animate-pulse">
                    <div className="flex items-center gap-2 text-red-400 text-xs font-bold">
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
                <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 glass px-4 py-2 rounded-full animate-fade-in-down">
                    <div className="flex items-center gap-2 text-yellow-500 text-xs font-bold">
                        <Users size={14} />
                        观战中 - 本局结束后加入
                    </div>
                </div>
            )}

            <div className="poker-table">
                <div className="poker-felt-texture" />

                <div className="pot-pos text-center w-full scale-90">
                    <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">TOTAL POT</span>
                    <div className="text-3xl font-black text-yellow-500 flex items-center justify-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-yellow-500 border-2 border-yellow-200 shadow-inner flex items-center justify-center">
                            <Coins size={12} className="text-yellow-900" />
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
                                        gameState={game.state} 
                                    />
                                ) : (
                                    // 只在等待状态下显示空座位
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

            <div className={`p-4 glass ${showRaiseUI ? 'opacity-20 pointer-events-none' : ''} m-2 mb-4 flex flex-col gap-3 transition-opacity`}>
                {game.isSpectator ? (
                    <div className="flex flex-col items-center gap-3 py-2">
                        <div className="text-yellow-500 font-bold text-lg">👁️ 观战模式</div>
                        <div className="text-xs text-white/60 text-center mb-2">
                            在线: {game.players.length + game.spectators.length} 人 | 座位: {game.players.length}/{12} | 观战: {game.spectators.length}
                        </div>
                        <div className="text-xs text-white/40 text-center">
                            {game.state !== GameState.Waiting ? '游戏进行中，请等待本局结束' : '点击空座位入座'}
                        </div>
                    </div>
                ) : game.state !== GameState.Waiting && game.state !== GameState.Finished ? (
                    <>
                        <div className="flex justify-between items-center px-1">
                            <span className="text-xs text-white/60">
                                手牌: <span className="text-yellow-500 font-bold">
                                    {hero?.hasViewedCards ? (game.currentHandType || '等待中') : '未查看'}
                                </span>
                            </span>
                            <span className="text-xs text-white/60">
                                当前注: <span className="text-white font-bold">${hero?.currentBet || 0}</span>
                            </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <button
                                onClick={() => handleAction('fold')}
                                className="py-3 rounded-xl bg-gray-800 font-bold border border-white/10 text-red-500 shadow-lg active:scale-95"
                            >
                                弃牌
                            </button>
                            <button
                                onClick={() => handleAction(game.currentMaxBet === (hero?.currentBet || 0) ? 'check' : 'call')}
                                className="py-3 rounded-xl bg-blue-600 font-bold shadow-lg active:scale-95"
                            >
                                {game.currentMaxBet === (hero?.currentBet || 0) ? '过牌' : '跟注'}
                            </button>
                            <button
                                onClick={() => {
                                    setRaiseAmount(Math.max(minRaise, game.currentMaxBet + 20));
                                    setShowRaiseUI(true);
                                }}
                                className="py-3 rounded-xl bg-green-600 font-bold shadow-lg active:scale-95"
                            >
                                加注
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center gap-3">
                        <div className="text-xs text-white/40 mb-1 flex items-center gap-1">
                            <Users size={12} /> 在线: {game.players.length + game.spectators.length} | 座位: {game.players.length}/{12} | 观战: {game.spectators.length}
                        </div>
                        
                        <div className="w-full grid grid-cols-2 gap-2">
                            <button
                                onClick={handleToggleReady}
                                className={`py-3 rounded-xl font-bold shadow-lg active:scale-95 ${
                                    hero?.isReady 
                                        ? 'bg-green-600 text-white' 
                                        : 'bg-gray-700 text-white/60'
                                }`}
                            >
                                {hero?.isReady ? '✓ 已准备' : '准备'}
                            </button>
                            <button
                                onClick={handleLeaveTable}
                                className="py-3 rounded-xl bg-gray-600 text-white font-bold shadow-lg active:scale-95"
                            >
                                去观战
                            </button>
                        </div>

                        <div className="text-xs text-white/40 text-center">
                            准备人数: {game.players.filter(p => p.isReady).length}/{game.players.length}
                        </div>

                        <button
                            onClick={handleStart}
                            disabled={game.players.filter(p => p.isReady).length < 2}
                            className={`py-4 w-full rounded-2xl font-black text-lg shadow-lg active:scale-95 transition-all ${
                                game.players.filter(p => p.isReady).length >= 2
                                    ? 'bg-yellow-500 text-black shadow-[0_0_25px_rgba(245,158,11,0.4)]'
                                    : 'bg-gray-700 text-white/40 cursor-not-allowed'
                            }`}
                        >
                            开始游戏
                        </button>
                    </div>
                )}
            </div>

            {showRaiseUI && (
                <div className="raise-ui-overlay">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-sm font-bold text-yellow-500 flex items-center gap-2">
                            <Coins size={16} /> 加注金额
                        </span>
                        <button onClick={() => setShowRaiseUI(false)} className="p-1 rounded-full bg-white/10">
                            <X size={18} />
                        </button>
                    </div>

                    <div className="text-4xl font-black text-center text-white mb-6">
                        ${raiseAmount}
                    </div>

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
                        <div className="flex justify-between text-[10px] text-white/40 font-bold">
                            <span>MIN ${minRaise}</span>
                            <span>MAX ${maxRaise}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-4">
                        <button
                            onClick={() => setRaiseAmount(maxRaise)}
                            className="py-3 rounded-xl bg-red-600 text-white font-black text-sm uppercase"
                        >
                            ALL IN!
                        </button>
                        <button
                            onClick={() => handleAction('raise', raiseAmount)}
                            className="py-3 rounded-xl bg-yellow-500 text-black font-black text-sm uppercase"
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
