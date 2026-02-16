
import { Card, Rank, Suit } from '../models/Card';

export enum HandRank {
    HighCard = 1,
    Pair,
    TwoPair,
    ThreeOfAKind,
    Straight,
    Flush,
    FullHouse,
    FourOfAKind,
    StraightFlush,
    RoyalFlush
}

export interface BestHand {
    rank: HandRank;
    cards: Card[]; // The 5 cards relevant to the hand
    description?: string;
    descriptionChinese?: string;
}

export class HandEvaluator {
    static getRankNameChinese(rank: HandRank): string {
        switch (rank) {
            case HandRank.HighCard: return '高牌';
            case HandRank.Pair: return '对子';
            case HandRank.TwoPair: return '两对';
            case HandRank.ThreeOfAKind: return '三条';
            case HandRank.Straight: return '顺子';
            case HandRank.Flush: return '同花';
            case HandRank.FullHouse: return '葫芦';
            case HandRank.FourOfAKind: return '四条';
            case HandRank.StraightFlush: return '同花顺';
            case HandRank.RoyalFlush: return '皇家同花顺';
            default: return '未知';
        }
    }

    static evaluate(allCards: Card[]): BestHand {
        if (allCards.length === 0) {
            return { rank: HandRank.HighCard, cards: [], description: 'No cards' };
        }

        // Sort by rank descending
        const cards = [...allCards].sort((a, b) => b.rank - a.rank);

        // Check Flush
        const flush = this.getFlush(cards);

        // Check Straight
        const straight = this.getStraight(cards);

        // Check Straight Flush
        if (flush) {
            const straightFlush = this.getStraight(flush.cards);
            if (straightFlush) {
                if (straightFlush.cards[0].rank === Rank.Ace && straightFlush.cards[1].rank === Rank.King) {
                    return { rank: HandRank.RoyalFlush, cards: straightFlush.cards, description: 'Royal Flush' };
                }
                return { rank: HandRank.StraightFlush, cards: straightFlush.cards, description: 'Straight Flush' };
            }
        }

        const rankCounts = new Map<Rank, Card[]>();
        for (const card of cards) {
            if (!rankCounts.has(card.rank)) rankCounts.set(card.rank, []);
            rankCounts.get(card.rank)!.push(card);
        }

        const fourOfAKind = this.getFourOfAKind(cards, rankCounts);
        if (fourOfAKind) return fourOfAKind;

        const fullHouse = this.getFullHouse(cards, rankCounts);
        if (fullHouse) return fullHouse;

        if (flush) return { rank: HandRank.Flush, cards: flush.cards.slice(0, 5), description: 'Flush' };

        if (straight) return { rank: HandRank.Straight, cards: straight.cards, description: 'Straight' };

        const threeOfAKind = this.getThreeOfAKind(cards, rankCounts);
        if (threeOfAKind) return threeOfAKind;

        const twoPair = this.getTwoPair(cards, rankCounts);
        if (twoPair) return twoPair;

        const pair = this.getPair(cards, rankCounts);
        if (pair) return pair;

        return {
            rank: HandRank.HighCard,
            cards: cards.slice(0, 5),
            description: 'High Card'
        };
    }

    private static getFlush(cards: Card[]): { cards: Card[] } | null {
        const suits = new Map<Suit, Card[]>();
        for (const card of cards) {
            if (!suits.has(card.suit)) suits.set(card.suit, []);
            suits.get(card.suit)!.push(card);
        }

        for (const suitCards of suits.values()) {
            if (suitCards.length >= 5) {
                // Return ALL cards for SF check, sorted by rank (input was sorted)
                return { cards: suitCards };
            }
        }
        return null;
    }

    private static getStraight(cards: Card[]): { cards: Card[] } | null {
        // Unique ranks
        const unique = cards.filter((c, i, arr) => i === 0 || c.rank !== arr[i - 1].rank);

        if (unique.length < 5) return null;

        // Check normal straights
        for (let i = 0; i <= unique.length - 5; i++) {
            const straight = unique.slice(i, i + 5);
            if (straight[0].rank - straight[4].rank === 4) {
                return { cards: straight };
            }
        }

        // Check Ace Low: A, 5, 4, 3, 2
        // A is correctly at index 0 (rank 14) due to sort
        if (unique[0].rank === Rank.Ace) {
            const lowStraight = [Rank.Five, Rank.Four, Rank.Three, Rank.Two];
            const foundLow = lowStraight.map(r => unique.find(c => c.rank === r)).filter(c => c !== undefined) as Card[];

            if (foundLow.length === 4) {
                return { cards: [foundLow[0], foundLow[1], foundLow[2], foundLow[3], unique[0]] }; // 5,4,3,2,A logic
            }
        }

        return null;
    }

    private static getFourOfAKind(cards: Card[], counts: Map<Rank, Card[]>): BestHand | null {
        for (const [rank, group] of counts.entries()) {
            if (group.length >= 4) {
                const kicker = cards.find(c => c.rank !== rank);
                // If kicker exists?
                const handCards = [...group.slice(0, 4)];
                if (kicker) handCards.push(kicker);

                return { rank: HandRank.FourOfAKind, cards: handCards, description: 'Four of a Kind' };
            }
        }
        return null;
    }

    private static getFullHouse(cards: Card[], counts: Map<Rank, Card[]>): BestHand | null {
        let threeRank: Rank | null = null;
        let twoRank: Rank | null = null;

        // Since map iteration order matches insertion (sorted), key order is descending rank
        // But Map.entries() iteration order is insertion order! 
        // We inserted in descending order of cards. So first inserted is highest rank.

        for (const [rank, group] of counts.entries()) {
            if (group.length >= 3) {
                if (threeRank === null) {
                    threeRank = rank;
                } else if (twoRank === null) {
                    twoRank = rank; // Second triplet becomes the pair
                }
            } else if (group.length >= 2) {
                if (twoRank === null) {
                    twoRank = rank;
                }
            }
        }

        if (threeRank !== null && twoRank !== null) {
            return {
                rank: HandRank.FullHouse,
                cards: [...counts.get(threeRank)!.slice(0, 3), ...counts.get(twoRank)!.slice(0, 2)],
                description: 'Full House'
            };
        }
        return null;
    }

    private static getThreeOfAKind(cards: Card[], counts: Map<Rank, Card[]>): BestHand | null {
        for (const [rank, group] of counts.entries()) {
            if (group.length >= 3) {
                const kickers = cards.filter(c => c.rank !== rank).slice(0, 2);
                return {
                    rank: HandRank.ThreeOfAKind,
                    cards: [...group.slice(0, 3), ...kickers],
                    description: 'Three of a Kind'
                };
            }
        }
        return null;
    }

    private static getTwoPair(cards: Card[], counts: Map<Rank, Card[]>): BestHand | null {
        const pairs: Rank[] = [];
        for (const [rank, group] of counts.entries()) {
            if (group.length >= 2) {
                pairs.push(rank);
                if (pairs.length === 2) break;
            }
        }

        if (pairs.length === 2) {
            const p1 = counts.get(pairs[0])!.slice(0, 2);
            const p2 = counts.get(pairs[1])!.slice(0, 2);
            const kicker = cards.find(c => c.rank !== pairs[0] && c.rank !== pairs[1]);
            const handCards = [...p1, ...p2];
            if (kicker) handCards.push(kicker);

            return {
                rank: HandRank.TwoPair,
                cards: handCards,
                description: 'Two Pair'
            };
        }
        return null;
    }

    private static getPair(cards: Card[], counts: Map<Rank, Card[]>): BestHand | null {
        for (const [rank, group] of counts.entries()) {
            if (group.length >= 2) {
                const kickers = cards.filter(c => c.rank !== rank).slice(0, 3);
                return {
                    rank: HandRank.Pair,
                    cards: [...group.slice(0, 2), ...kickers],
                    description: 'Pair'
                };
            }
        }
        return null;
    }
}
