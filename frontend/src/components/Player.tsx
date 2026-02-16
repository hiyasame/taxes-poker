import React from 'react';
import { PlayerStatus, GameState } from '../types';
import type { PlayerView } from '../types';
import { Card } from './Card';
import { User, Coins, Eye, EyeOff } from 'lucide-react';

export const Player: React.FC<{ 
    player: PlayerView; 
    onViewCards?: () => void;
    onRequestViewHand?: (targetPlayerId: string) => void;
    gameState?: GameState;
}> = ({ player, onViewCards, onRequestViewHand, gameState }) => {
    const isFolded = player.status === PlayerStatus.Folded;
    const isActive = player.status === PlayerStatus.Active || player.status === PlayerStatus.AllIn;
    const isWaitingOrFinished = gameState === GameState.Waiting || gameState === GameState.Finished;

    const handleCardClick = () => {
        if (player.isSelf && !isWaitingOrFinished) {
            onViewCards?.();
        } else if (!player.isSelf && gameState === GameState.Waiting && onRequestViewHand) {
            onRequestViewHand(player.id);
        }
    };

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
                className={`player-hand ${
                    (player.isSelf && gameState === GameState.Waiting && player.totalContributed > 0) ||
                    (player.isSelf && !isWaitingOrFinished) || 
                    (!player.isSelf && gameState === GameState.Waiting && player.totalContributed > 0) 
                        ? 'cursor-pointer' 
                        : ''
                }`}
                onClick={handleCardClick}
            >
                {player.isSelf && player.hasViewedCards && player.hand && player.hand.length > 0 ? (
                    player.hand.map((c, i) => (
                        <Card key={i} card={c} />
                    ))
                ) : player.isSelf && !player.hasViewedCards && player.hand && player.hand.length > 0 && !isWaitingOrFinished ? (
                    <>
                        <Card hidden />
                        <Card hidden />
                    </>
                ) : player.isSelf && !player.hasViewedCards && gameState === GameState.Waiting && player.totalContributed > 0 ? (
                    <>
                        <Card hidden />
                        <Card hidden />
                    </>
                ) : !player.isSelf && player.hand && player.hand.length > 0 ? (
                    player.hand.map((c, i) => (
                        <Card key={i} card={c} />
                    ))
                ) : !player.isSelf && gameState === GameState.Waiting && !player.hand && player.totalContributed > 0 ? (
                    <>
                        <Card hidden />
                        <Card hidden />
                    </>
                ) : !player.isSelf && !isWaitingOrFinished && isActive ? (
                    <>
                        <Card hidden />
                        <Card hidden />
                    </>
                ) : null}
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
