import React from 'react';
import { PlayerStatus, GameState } from '../types';
import type { PlayerView } from '../types';
import { Card } from './Card';
import { User, Coins, Eye, EyeOff } from 'lucide-react';

export const Player: React.FC<{ 
    player: PlayerView; 
    onViewCards?: () => void;
    gameState?: GameState;
}> = ({ player, onViewCards, gameState }) => {
    const isFolded = player.status === PlayerStatus.Folded;
    const isActive = player.status === PlayerStatus.Active || player.status === PlayerStatus.AllIn;
    const isWaitingOrFinished = gameState === GameState.Waiting || gameState === GameState.Finished;

    return (
        <div className={`player-seat ${isFolded ? 'folded' : ''} ${player.isCurrentTurn ? 'active-turn' : ''}`}>
            {/* Bet amount bubble */}
            {player.currentBet > 0 && (
                <div className="bet-bubble">
                    <Coins size={10} /> {player.currentBet}
                </div>
            )}

            {/* Hand */}
            <div 
                className={`player-hand ${player.isSelf && !isWaitingOrFinished ? 'cursor-pointer' : ''}`}
                onClick={player.isSelf && !isWaitingOrFinished ? onViewCards : undefined}
            >
                {!isWaitingOrFinished && player.isSelf && player.hand && player.hand.length > 0 && player.hasViewedCards ? (
                    // 自己的牌且已查看 - 显示牌面
                    player.hand.map((c, i) => (
                        <Card key={i} card={c} />
                    ))
                ) : !isWaitingOrFinished && player.hand && player.hand.length > 0 ? (
                    // 其他人的牌（摊牌时） - 显示牌面
                    player.hand.map((c, i) => (
                        <Card key={i} card={c} />
                    ))
                ) : (
                    !isWaitingOrFinished && isActive && (
                        // 未查看或背面
                        <>
                            <Card hidden />
                            <Card hidden />
                        </>
                    )
                )}
            </div>

            {/* Avatar & Info */}
            <div className="player-info-card glass">
                {player.isDealer && (
                    <div className="dealer-button">D</div>
                )}

                <div className="player-main-info">
                    <div className="player-avatar">
                        <User size={16} />
                    </div>
                    <div className="player-text-info">
                        <span className="player-name">{player.name}</span>
                        <span className="player-stack">${player.stack}</span>
                    </div>
                </div>

                {player.isCurrentTurn && <div className="turn-indicator" />}
                
                {gameState === GameState.Waiting && player.isReady && (
                    <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-1">
                        <div className="text-white text-[8px] font-bold px-1">✓</div>
                    </div>
                )}
                
                {!player.isSelf && isActive && player.hasViewedCards && gameState !== GameState.Waiting && (
                    <div className="absolute -top-1 -right-1 bg-blue-500 rounded-full p-1">
                        <Eye size={10} className="text-white" />
                    </div>
                )}
                {!player.isSelf && isActive && !player.hasViewedCards && gameState !== GameState.Waiting && (
                    <div className="absolute -top-1 -right-1 bg-gray-500 rounded-full p-1">
                        <EyeOff size={10} className="text-white/50" />
                    </div>
                )}
            </div>

            <div className="player-status-labels">
                {player.status === PlayerStatus.Folded && <span className="status-folded">已弃牌</span>}
                {player.status === PlayerStatus.AllIn && <span className="status-allin">ALL IN</span>}
            </div>
        </div>
    );
};
