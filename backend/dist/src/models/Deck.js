"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Deck = void 0;
const Card_1 = require("./Card");
class Deck {
    constructor() {
        this.cards = [];
        this.reset();
    }
    get currentDeck() {
        return [...this.cards];
    }
    reset() {
        this.cards = [];
        const suits = Object.values(Card_1.Suit);
        const ranks = Object.values(Card_1.Rank).filter(r => typeof r === 'number');
        for (const suit of suits) {
            for (const rank of ranks) {
                this.cards.push(new Card_1.Card(suit, rank));
            }
        }
    }
    shuffle() {
        // Fisher-Yates shuffle
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }
    deal() {
        return this.cards.pop();
    }
    dealMultiple(count) {
        const dealt = [];
        for (let i = 0; i < count; i++) {
            const card = this.deal();
            if (card)
                dealt.push(card);
        }
        return dealt;
    }
    get size() {
        return this.cards.length;
    }
}
exports.Deck = Deck;
