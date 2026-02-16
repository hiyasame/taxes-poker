
import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { GameState } from './types';
import type { GameView } from './types';
import { Player } from './components/Player';
import { Card } from './components/Card';
import { Trophy, Users, Bell, Coins, X } from 'lucide-react';
import './App.css';

const socket: Socket = io('http://localhost:3001');

const PokerTable: React.FC = () => {
    const [game, setGame] = useState<GameView | null>(null);
    const [name, setName] = useState('');
    const [joined, setJoined] = useState(false);
    const [showRaiseUI, setShowRaiseUI] = useState(false);
    const [raiseAmount, setRaiseAmount] = useState(0);
    const [notification, setNotification] = useState<{ message: string, type: 'info' | 'alert' } | null>(null);
    const lastStateRef = useRef<GameView | null>(null);

    useEffect(() => {
        socket.on('state', (state: GameView) => {
            // Check for actions to notify
            if (lastStateRef.current) {
                const prevGame = lastStateRef.current;

                // 1. Detect who acted
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

                // 2. Detect turn change
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
        });

        socket.on('error', (msg: string) => {
            notify(msg, 'alert');
        });

        return () => {
            socket.off('state');
            socket.off('error');
        };
    }, []);

    const notify = (message: string, type: 'info' | 'alert' = 'info') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 4000);
    };

    const handleJoin = () => {
        if (name) {
            socket.emit('join', name);
            setJoined(true);
        }
    };

    const handleAction = (type: string, amount?: number) => {
        socket.emit('action', { type, amount });
        setShowRaiseUI(false);
    };

    const handleStart = () => {
        socket.emit('startGame');
    };

    const getRotatedPlayers = () => {
        if (!game) return [];
        const players = [...game.players];
        const meIndex = players.findIndex(p => p.isSelf);
        if (meIndex === -1) return players;
        return [...players.slice(meIndex), ...players.slice(0, meIndex)];
    };

    if (!joined) {
        return (
            <div id="mobile-container" className="flex items-center justify-center">
                <div className="glass p-8 m-4 w-full max-w-xs text-center animate-zoom-in">
                    <h1 className="text-2xl font-black text-yellow-500 mb-6 font-outfit">联机德州扑克</h1>
                    <input
                        type="text"
                        placeholder="输入玩家昵称"
                        className="w-full p-3 rounded-xl bg-white/10 border border-white/20 text-white mb-4 outline-none focus:border-yellow-500"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                    <button
                        onClick={handleJoin}
                        className="w-full py-4 bg-yellow-500 text-black font-black rounded-xl shadow-lg active:scale-95 transition-all outline-none"
                    >
                        进入大厅
                    </button>
                </div>
            </div>
        );
    }

    if (!game) return <div className="text-white flex items-center justify-center h-full">正在连接服务器...</div>;

    const rotatedPlayers = getRotatedPlayers();
    const hero = game.me;
    const minRaise = game.currentMaxBet * 2 || 40; // Basic rule: double previous bet
    const maxRaise = hero?.stack || 0;

    return (
        <div id="mobile-container" className="relative overflow-hidden">
            {/* Notifications */}
            {notification && (
                <div className={`notification-toast ${notification.type === 'alert' ? 'turn-alert' : ''}`}>
                    <Bell size={14} className="mr-2" />
                    {notification.message}
                </div>
            )}

            <div className="poker-table">
                <div className="poker-felt-texture" />

                {/* Pot */}
                <div className="pot-pos text-center w-full scale-90">
                    <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">TOTAL POT</span>
                    <div className="text-3xl font-black text-yellow-500 flex items-center justify-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-yellow-500 border-2 border-yellow-200 shadow-inner flex items-center justify-center">
                            <Coins size={12} className="text-yellow-900" />
                        </div>
                        ${game.pot}
                    </div>
                </div>

                {/* Community Cards */}
                <div className="community-cards-pos flex gap-1-5">
                    {[0, 1, 2, 3, 4].map(i => (
                        game.communityCards[i] ? (
                            <Card key={i} card={game.communityCards[i]} />
                        ) : (
                            <div key={i} className="community-card-slot" />
                        )
                    ))}
                </div>

                {/* Players Circular Layout (Avoids center overlap) */}
                <div className="absolute inset-0 pointer-events-none">
                    {/* Seat 0: Hero (Bottom Center) */}
                    <div className="absolute bottom-16 left-1/2 -translate-x-1/2 pointer-events-auto">
                        {rotatedPlayers[0] && <Player player={rotatedPlayers[0]} />}
                    </div>
                    {/* Seat 1: Left Bottom-Side */}
                    <div className="absolute left-2 top-75p -translate-y-1/2 pointer-events-auto">
                        {rotatedPlayers[1] && <Player player={rotatedPlayers[1]} />}
                    </div>
                    {/* Seat 2: Left Top-Side */}
                    <div className="absolute left-2 top-30p -translate-y-1/2 pointer-events-auto">
                        {rotatedPlayers[2] && <Player player={rotatedPlayers[2]} />}
                    </div>
                    {/* Seat 3: Top Center (Opposite) */}
                    <div className="absolute top-16 left-1/2 -translate-x-1/2 pointer-events-auto">
                        {rotatedPlayers[3] && <Player player={rotatedPlayers[3]} />}
                    </div>
                    {/* Seat 4: Right Top-Side */}
                    <div className="absolute right-2 top-30p -translate-y-1/2 pointer-events-auto">
                        {rotatedPlayers[4] && <Player player={rotatedPlayers[4]} />}
                    </div>
                    {/* Seat 5: Right Bottom-Side */}
                    <div className="absolute right-2 top-75p -translate-y-1/2 pointer-events-auto">
                        {rotatedPlayers[5] && <Player player={rotatedPlayers[5]} />}
                    </div>
                </div>
            </div>

            {/* Action Controls */}
            <div className={`p-4 glass ${showRaiseUI ? 'opacity-20 pointer-events-none' : ''} m-2 mb-4 flex flex-col gap-3 transition-opacity`}>
                {game.state !== GameState.Waiting && game.state !== GameState.Finished ? (
                    <>
                        <div className="flex justify-between items-center px-1">
                            <span className="text-xs text-white/60">
                                手牌: <span className="text-yellow-500 font-bold">{game.currentHandType || '等待中'}</span>
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
                    <div className="flex flex-col items-center gap-2">
                        <div className="text-xs text-white/40 mb-1 flex items-center gap-1">
                            <Users size={12} /> 在线玩家: {game.players.length}
                        </div>
                        <button
                            onClick={handleStart}
                            className="py-4 w-full rounded-2xl bg-yellow-500 text-black font-black text-lg shadow-[0_0_25px_rgba(245,158,11,0.4)] active:scale-95 transition-all"
                        >
                            {game.state === GameState.Finished ? '再来一局' : (game.players.length < 2 ? '等待玩家...' : '开始游戏')}
                        </button>
                    </div>
                )}
            </div>

            {/* Custom Raise UI */}
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

            {/* Result Modal */}
            {game.state === GameState.Finished && (
                <div className="absolute inset-0 modal-overlay flex items-center justify-center z-50 p-6 animate-zoom-in">
                    <div className={`modal-content ${game.winners?.includes(hero?.id || '') ? 'modal-victory' : 'modal-defeat'}`}>
                        <Trophy className={`w-16 h-16 mx-auto mb-4 ${game.winners?.includes(hero?.id || '') ? 'text-green-500' : 'text-gray-400'}`} />

                        <h2 className={`text-2xl font-black mb-2 uppercase tracking-wider ${game.winners?.includes(hero?.id || '') ? 'text-green-500' : 'text-red-500'}`}>
                            {game.winners?.includes(hero?.id || '') ? 'VICTORY 胜利!' : 'DEFEAT 失败!'}
                        </h2>

                        <div className="text-sm text-white/60 mb-1">
                            {game.winners?.includes(hero?.id || '')
                                ? `恭喜！你赢得了本局彩池`
                                : `胜者: ${game.winners?.map(id => game.players.find(p => p.id === id)?.name).join(', ')}`}
                        </div>

                        <div className={`amount-display ${game.winners?.includes(hero?.id || '') ? 'text-green-500' : 'text-red-500'}`}>
                            {game.winners?.includes(hero?.id || '')
                                ? `净获利 $${game.pot - (hero?.totalContributed || 0)}`
                                : `本局损失 $${hero?.totalContributed || 0}`}
                        </div>

                        <button
                            onClick={handleStart}
                            className="w-full mt-6 py-4 bg-yellow-500 text-black font-black rounded-xl shadow-lg active:scale-95 transition-all"
                        >
                            继续下一局
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PokerTable;
