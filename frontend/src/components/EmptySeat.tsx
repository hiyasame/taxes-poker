import React from 'react';
import { UserPlus } from 'lucide-react';

export const EmptySeat: React.FC<{ 
    seatIndex: number;
    canTakeSeat: boolean;
    onTakeSeat: (seatIndex: number) => void;
}> = ({ seatIndex, canTakeSeat, onTakeSeat }) => {
    return (
        <div 
            className={`player-seat ${canTakeSeat ? 'cursor-pointer hover:scale-105 transition-transform' : 'opacity-40'}`}
            onClick={() => canTakeSeat && onTakeSeat(seatIndex)}
        >
            <div className="player-hand" />
            
            <div className="player-info-card glass border-dashed border-2 border-white/30">
                <div className="player-main-info">
                    <div className="player-avatar bg-white/5">
                        <UserPlus size={16} className="text-white/40" />
                    </div>
                    <div className="player-text-info">
                        <span className="player-name text-white/40">
                            {canTakeSeat ? `座位 ${seatIndex}` : '空位'}
                        </span>
                        <span className="player-stack text-white/30 text-[10px]">
                            {canTakeSeat ? '点击入座' : '--'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};
