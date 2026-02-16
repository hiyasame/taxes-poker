
export enum Suit {
    Hearts = 'HEARTS',
    Diamonds = 'DIAMONDS',
    Spades = 'SPADES',
    Clubs = 'CLUBS'
}

export enum Rank {
    Two = 2,
    Three = 3,
    Four = 4,
    Five = 5,
    Six = 6,
    Seven = 7,
    Eight = 8,
    Nine = 9,
    Ten = 10,
    Jack = 11,
    Queen = 12,
    King = 13,
    Ace = 14
}

export class Card {
    constructor(public readonly suit: Suit, public readonly rank: Rank) { }

    toString(): string {
        return `${Rank[this.rank]} of ${this.suit}`;
    }

    equals(other: Card): boolean {
        return this.suit === other.suit && this.rank === other.rank;
    }
}
