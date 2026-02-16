
import { Deck } from '../src/models/Deck';
import { Card, Suit, Rank } from '../src/models/Card';

describe('Card', () => {
    it('should create a card correctly', () => {
        const card = new Card(Suit.Hearts, Rank.Ace);
        expect(card.suit).toBe(Suit.Hearts);
        expect(card.rank).toBe(Rank.Ace);
    });
});

describe('Deck', () => {
    let deck: Deck;

    beforeEach(() => {
        deck = new Deck();
    });

    it('should initialize with 52 cards', () => {
        expect(deck.size).toBe(52);
    });

    it('should shuffle the deck', () => {
        deck.reset();
        const initialDeck = deck.currentDeck;
        deck.shuffle();
        const shuffledDeck = deck.currentDeck;

        // Very unlikely to be same order
        expect(initialDeck).not.toEqual(shuffledDeck);
        expect(shuffledDeck.length).toBe(52);
    });

    it('should deal a card', () => {
        const card = deck.deal();
        expect(card).toBeInstanceOf(Card);
        expect(deck.size).toBe(51);
    });

    it('should deal multiple cards', () => {
        const cards = deck.dealMultiple(5);
        expect(cards.length).toBe(5);
        expect(deck.size).toBe(47);
    });
});
