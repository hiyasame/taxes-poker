
import React from 'react';
import { PlayerStatus } from '../types';
import type { PlayerView } from '../types';
import { Card } from './Card';
import { User, Coins } from 'lucide-react';

export const Player: React.FC<{ player: PlayerView }> = ({ player }) => {
    const isFolded = player.status === PlayerStatus.Folded;
    const isActive = player.status === PlayerStatus.Active || player.status === PlayerStatus.AllIn;

    return (
        <div className={`player-seat ${isFolded ? 'folded' : ''} ${player.isCurrentTurn ? 'active-turn' : ''}`}>
            {/* Bet amount bubble */}
            {player.currentBet > 0 && (
                <div className="bet-bubble">
                    <Coins size={10} /> {player.currentBet}
                </div>
            )}

            {/* Hand */}
            <div className="player-hand">
                {player.hand && player.hand.length > 0 ? (
                    player.hand.map((c, i) => (
                        <Card key={i} card={c} />
                    ))
                ) : (
                    isActive && (
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
            </div>

            <div className="player-status-labels">
                {player.status === PlayerStatus.Folded && <span className="status-folded">已弃牌</span>}
                {player.status === PlayerStatus.AllIn && <span className="status-allin">ALL IN</span>}
            </div>
        </div>
    );
};
