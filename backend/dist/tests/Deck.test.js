"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Deck_1 = require("../src/models/Deck");
const Card_1 = require("../src/models/Card");
describe('Card', () => {
    it('should create a card correctly', () => {
        const card = new Card_1.Card(Card_1.Suit.Hearts, Card_1.Rank.Ace);
        expect(card.suit).toBe(Card_1.Suit.Hearts);
        expect(card.rank).toBe(Card_1.Rank.Ace);
    });
});
describe('Deck', () => {
    let deck;
    beforeEach(() => {
        deck = new Deck_1.Deck();
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
        expect(card).toBeInstanceOf(Card_1.Card);
        expect(deck.size).toBe(51);
    });
    it('should deal multiple cards', () => {
        const cards = deck.dealMultiple(5);
        expect(cards.length).toBe(5);
        expect(deck.size).toBe(47);
    });
});
