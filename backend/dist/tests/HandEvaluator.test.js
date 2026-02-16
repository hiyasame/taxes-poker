"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const HandEvaluator_1 = require("../src/game/HandEvaluator");
const Card_1 = require("../src/models/Card");
describe('HandEvaluator', () => {
    // Helper to create cards
    const c = (rank, suit) => new Card_1.Card(suit, rank);
    const H = Card_1.Suit.Hearts;
    const D = Card_1.Suit.Diamonds;
    const S = Card_1.Suit.Spades;
    const C = Card_1.Suit.Clubs;
    it('should evaluate Royal Flush', () => {
        const cards = [
            c(Card_1.Rank.Ace, H), c(Card_1.Rank.King, H), c(Card_1.Rank.Queen, H), c(Card_1.Rank.Jack, H), c(Card_1.Rank.Ten, H),
            c(Card_1.Rank.Two, D), c(Card_1.Rank.Three, C)
        ];
        const result = HandEvaluator_1.HandEvaluator.evaluate(cards);
        expect(result.rank).toBe(HandEvaluator_1.HandRank.RoyalFlush);
    });
    it('should evaluate Straight Flush', () => {
        const cards = [
            c(Card_1.Rank.Nine, S), c(Card_1.Rank.Eight, S), c(Card_1.Rank.Seven, S), c(Card_1.Rank.Six, S), c(Card_1.Rank.Five, S),
            c(Card_1.Rank.Ace, D), c(Card_1.Rank.King, C)
        ];
        const result = HandEvaluator_1.HandEvaluator.evaluate(cards);
        expect(result.rank).toBe(HandEvaluator_1.HandRank.StraightFlush);
        expect(result.cards[0].rank).toBe(Card_1.Rank.Nine);
    });
    it('should evaluate Four of a Kind', () => {
        const cards = [
            c(Card_1.Rank.Five, H), c(Card_1.Rank.Five, D), c(Card_1.Rank.Five, S), c(Card_1.Rank.Five, C),
            c(Card_1.Rank.Ace, H), c(Card_1.Rank.King, D), c(Card_1.Rank.Two, S)
        ];
        const result = HandEvaluator_1.HandEvaluator.evaluate(cards);
        expect(result.rank).toBe(HandEvaluator_1.HandRank.FourOfAKind);
        expect(result.cards[0].rank).toBe(Card_1.Rank.Five);
        expect(result.cards[4].rank).toBe(Card_1.Rank.Ace); // Kicker
    });
    it('should evaluate Full House', () => {
        const cards = [
            c(Card_1.Rank.Ten, H), c(Card_1.Rank.Ten, D), c(Card_1.Rank.Ten, S),
            c(Card_1.Rank.Nine, C), c(Card_1.Rank.Nine, H),
            c(Card_1.Rank.Two, D), c(Card_1.Rank.Three, S)
        ];
        const result = HandEvaluator_1.HandEvaluator.evaluate(cards);
        expect(result.rank).toBe(HandEvaluator_1.HandRank.FullHouse);
    });
    it('should evaluate Flush', () => {
        const cards = [
            c(Card_1.Rank.Ace, H), c(Card_1.Rank.Jack, H), c(Card_1.Rank.Eight, H), c(Card_1.Rank.Four, H), c(Card_1.Rank.Two, H),
            c(Card_1.Rank.King, S), c(Card_1.Rank.Queen, D)
        ];
        const result = HandEvaluator_1.HandEvaluator.evaluate(cards);
        expect(result.rank).toBe(HandEvaluator_1.HandRank.Flush);
    });
    it('should evaluate Straight (Ace High)', () => {
        const cards = [
            c(Card_1.Rank.Ace, H), c(Card_1.Rank.King, D), c(Card_1.Rank.Queen, S), c(Card_1.Rank.Jack, C), c(Card_1.Rank.Ten, H),
            c(Card_1.Rank.Two, D), c(Card_1.Rank.Three, S)
        ];
        const result = HandEvaluator_1.HandEvaluator.evaluate(cards);
        expect(result.rank).toBe(HandEvaluator_1.HandRank.Straight);
    });
    it('should evaluate Straight (Ace Low)', () => {
        const cards = [
            c(Card_1.Rank.Ace, H), c(Card_1.Rank.Five, D), c(Card_1.Rank.Four, S), c(Card_1.Rank.Three, C), c(Card_1.Rank.Two, H),
            c(Card_1.Rank.Nine, D), c(Card_1.Rank.Eight, S)
        ];
        const result = HandEvaluator_1.HandEvaluator.evaluate(cards);
        expect(result.rank).toBe(HandEvaluator_1.HandRank.Straight);
        expect(result.cards[0].rank).toBe(Card_1.Rank.Five);
    });
    it('should evaluate Three of a Kind', () => {
        const cards = [
            c(Card_1.Rank.Eight, H), c(Card_1.Rank.Eight, D), c(Card_1.Rank.Eight, S),
            c(Card_1.Rank.Ace, C), c(Card_1.Rank.King, H),
            c(Card_1.Rank.Two, D), c(Card_1.Rank.Three, S)
        ];
        const result = HandEvaluator_1.HandEvaluator.evaluate(cards);
        expect(result.rank).toBe(HandEvaluator_1.HandRank.ThreeOfAKind);
    });
    it('should evaluate Two Pair', () => {
        const cards = [
            c(Card_1.Rank.Jack, H), c(Card_1.Rank.Jack, D),
            c(Card_1.Rank.Ten, S), c(Card_1.Rank.Ten, C),
            c(Card_1.Rank.Ace, H),
            c(Card_1.Rank.Two, D), c(Card_1.Rank.Three, S)
        ];
        const result = HandEvaluator_1.HandEvaluator.evaluate(cards);
        expect(result.rank).toBe(HandEvaluator_1.HandRank.TwoPair);
        expect(result.cards[4].rank).toBe(Card_1.Rank.Ace); // Kicker
    });
    it('should evaluate One Pair', () => {
        const cards = [
            c(Card_1.Rank.Queen, H), c(Card_1.Rank.Queen, D),
            c(Card_1.Rank.Ace, S), c(Card_1.Rank.King, C), c(Card_1.Rank.Jack, H),
            c(Card_1.Rank.Two, D), c(Card_1.Rank.Three, S)
        ];
        const result = HandEvaluator_1.HandEvaluator.evaluate(cards);
        expect(result.rank).toBe(HandEvaluator_1.HandRank.Pair);
    });
    it('should evaluate High Card', () => {
        const cards = [
            c(Card_1.Rank.Ace, H), c(Card_1.Rank.King, D), c(Card_1.Rank.Queen, S), c(Card_1.Rank.Nine, C), c(Card_1.Rank.Seven, H),
            c(Card_1.Rank.Five, D), c(Card_1.Rank.Three, S)
        ];
        const result = HandEvaluator_1.HandEvaluator.evaluate(cards);
        expect(result.rank).toBe(HandEvaluator_1.HandRank.HighCard);
    });
    it('should distinguish kickers in Two Pair', () => {
        // Player 1: KK, 88, A
        const hand1 = HandEvaluator_1.HandEvaluator.evaluate([
            c(Card_1.Rank.King, H), c(Card_1.Rank.King, D),
            c(Card_1.Rank.Eight, S), c(Card_1.Rank.Eight, C),
            c(Card_1.Rank.Ace, H), c(Card_1.Rank.Two, D), c(Card_1.Rank.Three, S)
        ]);
        // Player 2: KK, 88, Q
        const hand2 = HandEvaluator_1.HandEvaluator.evaluate([
            c(Card_1.Rank.King, S), c(Card_1.Rank.King, C),
            c(Card_1.Rank.Eight, H), c(Card_1.Rank.Eight, D),
            c(Card_1.Rank.Queen, S), c(Card_1.Rank.Two, C), c(Card_1.Rank.Three, H)
        ]);
        expect(hand1.rank).toBe(HandEvaluator_1.HandRank.TwoPair);
        expect(hand2.rank).toBe(HandEvaluator_1.HandRank.TwoPair);
        // This test logic depends on how we compare.
        // Assuming we compare card ranks sequentially.
        // hand1.cards[4] is Ace, hand2.cards[4] is Queen.
        expect(hand1.cards[4].rank).toBeGreaterThan(hand2.cards[4].rank);
    });
    it('should correct identifying Straight Flush vs just Flush', () => {
        // Flush 9,8,7,6,4 vs Straight Flush 9,8,7,6,5
        // Case: Player has 9h, 8h, 7h, 6h, 5h, 2h.
        // Wait, 9,8,7,6,5 is SF.
        const cards = [
            c(Card_1.Rank.Nine, H), c(Card_1.Rank.Eight, H), c(Card_1.Rank.Seven, H), c(Card_1.Rank.Six, H), c(Card_1.Rank.Five, H),
            c(Card_1.Rank.Two, H), c(Card_1.Rank.Ace, D)
        ];
        const result = HandEvaluator_1.HandEvaluator.evaluate(cards);
        expect(result.rank).toBe(HandEvaluator_1.HandRank.StraightFlush);
    });
});
