
import { Card, Suit, Rank } from './Card';

export class Deck {
    private cards: Card[] = [];

    constructor() {
        this.reset();
    }

    public get currentDeck(): Card[] {
        return [...this.cards];
    }

    public reset(): void {
        this.cards = [];
        const suits = Object.values(Suit) as Suit[];
        const ranks = Object.values(Rank).filter(r => typeof r === 'number') as Rank[];

        for (const suit of suits) {
            for (const rank of ranks) {
                this.cards.push(new Card(suit, rank));
            }
        }
    }

    public shuffle(): void {
        // Fisher-Yates shuffle
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    public deal(): Card | undefined {
        return this.cards.pop();
    }

    public dealMultiple(count: number): Card[] {
        const dealt: Card[] = [];
        for (let i = 0; i < count; i++) {
            const card = this.deal();
            if (card) dealt.push(card);
        }
        return dealt;
    }

    public get size(): number {
        return this.cards.length;
    }
}
