
import React from 'react';
import type { Card as CardType } from '../types';

const suitSymbols: Record<string, string> = {
    'HEARTS': '♥️',
    'DIAMONDS': '♦️',
    'SPADES': '♠️',
    'CLUBS': '♣️'
};

const rankLabels: Record<number | string, string> = {
    2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9',
    10: '10', 11: 'J', 12: 'Q', 13: 'K', 14: 'A'
};

export const Card: React.FC<{ card?: CardType; hidden?: boolean }> = ({ card, hidden }) => {
    // Debug: console.log('Rendering card:', card, 'hidden:', hidden);

    if (hidden || !card || !card.suit || !card.rank) {
        return (
            <div className="poker-card hidden-card">
                <div className="card-back-inner">
                    <div className="card-pattern" />
                </div>
            </div>
        );
    }

    const suit = String(card.suit).toUpperCase();
    const rank = card.rank;
    const isRed = suit === 'HEARTS' || suit === 'DIAMONDS';
    const symbol = suitSymbols[suit] || '?';
    const label = rankLabels[rank] || rank.toString();

    return (
        <div className={`poker-card ${isRed ? 'card-red' : 'card-black'}`}>
            <div className="card-corner top-left">{label}</div>
            <div className="card-suit-center">
                {symbol}
                {!symbol && <div style={{ fontSize: '8px' }}>{suit.substring(0, 1)}</div>}
            </div>
            <div className="card-corner bottom-right">{label}</div>
        </div>
    );
};
