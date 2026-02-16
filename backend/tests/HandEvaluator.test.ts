
import { HandEvaluator, HandRank } from '../src/game/HandEvaluator';
import { Card, Suit, Rank } from '../src/models/Card';

describe('HandEvaluator', () => {

    // Helper to create cards
    const c = (rank: number, suit: Suit) => new Card(suit, rank);
    const H = Suit.Hearts;
    const D = Suit.Diamonds;
    const S = Suit.Spades;
    const C = Suit.Clubs;

    it('should evaluate Royal Flush', () => {
        const cards = [
            c(Rank.Ace, H), c(Rank.King, H), c(Rank.Queen, H), c(Rank.Jack, H), c(Rank.Ten, H),
            c(Rank.Two, D), c(Rank.Three, C)
        ];
        const result = HandEvaluator.evaluate(cards);
        expect(result.rank).toBe(HandRank.RoyalFlush);
    });

    it('should evaluate Straight Flush', () => {
        const cards = [
            c(Rank.Nine, S), c(Rank.Eight, S), c(Rank.Seven, S), c(Rank.Six, S), c(Rank.Five, S),
            c(Rank.Ace, D), c(Rank.King, C)
        ];
        const result = HandEvaluator.evaluate(cards);
        expect(result.rank).toBe(HandRank.StraightFlush);
        expect(result.cards[0].rank).toBe(Rank.Nine);
    });

    it('should evaluate Four of a Kind', () => {
        const cards = [
            c(Rank.Five, H), c(Rank.Five, D), c(Rank.Five, S), c(Rank.Five, C),
            c(Rank.Ace, H), c(Rank.King, D), c(Rank.Two, S)
        ];
        const result = HandEvaluator.evaluate(cards);
        expect(result.rank).toBe(HandRank.FourOfAKind);
        expect(result.cards[0].rank).toBe(Rank.Five);
        expect(result.cards[4].rank).toBe(Rank.Ace); // Kicker
    });

    it('should evaluate Full House', () => {
        const cards = [
            c(Rank.Ten, H), c(Rank.Ten, D), c(Rank.Ten, S),
            c(Rank.Nine, C), c(Rank.Nine, H),
            c(Rank.Two, D), c(Rank.Three, S)
        ];
        const result = HandEvaluator.evaluate(cards);
        expect(result.rank).toBe(HandRank.FullHouse);
    });

    it('should evaluate Flush', () => {
        const cards = [
            c(Rank.Ace, H), c(Rank.Jack, H), c(Rank.Eight, H), c(Rank.Four, H), c(Rank.Two, H),
            c(Rank.King, S), c(Rank.Queen, D)
        ];
        const result = HandEvaluator.evaluate(cards);
        expect(result.rank).toBe(HandRank.Flush);
    });

    it('should evaluate Straight (Ace High)', () => {
        const cards = [
            c(Rank.Ace, H), c(Rank.King, D), c(Rank.Queen, S), c(Rank.Jack, C), c(Rank.Ten, H),
            c(Rank.Two, D), c(Rank.Three, S)
        ];
        const result = HandEvaluator.evaluate(cards);
        expect(result.rank).toBe(HandRank.Straight);
    });

    it('should evaluate Straight (Ace Low)', () => {
        const cards = [
            c(Rank.Ace, H), c(Rank.Five, D), c(Rank.Four, S), c(Rank.Three, C), c(Rank.Two, H),
            c(Rank.Nine, D), c(Rank.Eight, S)
        ];
        const result = HandEvaluator.evaluate(cards);
        expect(result.rank).toBe(HandRank.Straight);
        expect(result.cards[0].rank).toBe(Rank.Five);
    });

    it('should evaluate Three of a Kind', () => {
        const cards = [
            c(Rank.Eight, H), c(Rank.Eight, D), c(Rank.Eight, S),
            c(Rank.Ace, C), c(Rank.King, H),
            c(Rank.Two, D), c(Rank.Three, S)
        ];
        const result = HandEvaluator.evaluate(cards);
        expect(result.rank).toBe(HandRank.ThreeOfAKind);
    });

    it('should evaluate Two Pair', () => {
        const cards = [
            c(Rank.Jack, H), c(Rank.Jack, D),
            c(Rank.Ten, S), c(Rank.Ten, C),
            c(Rank.Ace, H),
            c(Rank.Two, D), c(Rank.Three, S)
        ];
        const result = HandEvaluator.evaluate(cards);
        expect(result.rank).toBe(HandRank.TwoPair);
        expect(result.cards[4].rank).toBe(Rank.Ace); // Kicker
    });

    it('should evaluate One Pair', () => {
        const cards = [
            c(Rank.Queen, H), c(Rank.Queen, D),
            c(Rank.Ace, S), c(Rank.King, C), c(Rank.Jack, H),
            c(Rank.Two, D), c(Rank.Three, S)
        ];
        const result = HandEvaluator.evaluate(cards);
        expect(result.rank).toBe(HandRank.Pair);
    });

    it('should evaluate High Card', () => {
        const cards = [
            c(Rank.Ace, H), c(Rank.King, D), c(Rank.Queen, S), c(Rank.Nine, C), c(Rank.Seven, H),
            c(Rank.Five, D), c(Rank.Three, S)
        ];
        const result = HandEvaluator.evaluate(cards);
        expect(result.rank).toBe(HandRank.HighCard);
    });

    it('should distinguish kickers in Two Pair', () => {
        // Player 1: KK, 88, A
        const hand1 = HandEvaluator.evaluate([
            c(Rank.King, H), c(Rank.King, D),
            c(Rank.Eight, S), c(Rank.Eight, C),
            c(Rank.Ace, H), c(Rank.Two, D), c(Rank.Three, S)
        ]);

        // Player 2: KK, 88, Q
        const hand2 = HandEvaluator.evaluate([
            c(Rank.King, S), c(Rank.King, C),
            c(Rank.Eight, H), c(Rank.Eight, D),
            c(Rank.Queen, S), c(Rank.Two, C), c(Rank.Three, H)
        ]);

        expect(hand1.rank).toBe(HandRank.TwoPair);
        expect(hand2.rank).toBe(HandRank.TwoPair);

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
            c(Rank.Nine, H), c(Rank.Eight, H), c(Rank.Seven, H), c(Rank.Six, H), c(Rank.Five, H),
            c(Rank.Two, H), c(Rank.Ace, D)
        ];
        const result = HandEvaluator.evaluate(cards);
        expect(result.rank).toBe(HandRank.StraightFlush);
    });
});
