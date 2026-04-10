import { Card, CardSuite, CardRank } from './Card';

export class Deck {
    // We use our literal types to ensure absolute safety
    private deckSize: 24 | 36 | 52;
    private cards: Card[] = [];

    constructor(deckSize: 24 | 36 | 52 = 36) {
        this.deckSize = deckSize;
    }

    refill(): void {
        this.cards = [];

        const suites: CardSuite[] = [
            CardSuite.Clubs,
            CardSuite.Diamonds,
            CardSuite.Hearts,
            CardSuite.Spades,
        ];

        // Build the dynamic ranks array based on the requested deck size
        let ranks: CardRank[] = [];

        if (this.deckSize === 24) {
            ranks = [
                CardRank.R9, CardRank.R10, CardRank.Jack,
                CardRank.Queen, CardRank.King, CardRank.Ace
            ];
        } else if (this.deckSize === 52) {
            ranks = [
                CardRank.R2, CardRank.R3, CardRank.R4, CardRank.R5,
                CardRank.R6, CardRank.R7, CardRank.R8, CardRank.R9, CardRank.R10,
                CardRank.Jack, CardRank.Queen, CardRank.King, CardRank.Ace
            ];
        } else { // Default to 36 cards
            ranks = [
                CardRank.R6, CardRank.R7, CardRank.R8, CardRank.R9, CardRank.R10,
                CardRank.Jack, CardRank.Queen, CardRank.King, CardRank.Ace
            ];
        }

        // Generate the deck
        suites.forEach((suite) => {
            ranks.forEach((rank) => {
                const card = new Card(suite, rank);
                this.cards.push(card);
            });
        });
    }

    // Fisher-Yates Shuffle Algorithm
    shuffle(): void {
        let currentIndex = this.cards.length;
        let temporaryValue, randomIndex;

        while (currentIndex !== 0) {
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex -= 1;

            temporaryValue = this.cards[currentIndex];
            this.cards[currentIndex] = this.cards[randomIndex];
            this.cards[randomIndex] = temporaryValue;
        }
    }

    push(...cards: Card[]): void {
        this.cards.push(...cards);
    }

    pop(): Card {
        return this.cards.pop()!;
    }

    takeBack(count: number): Card[] {
        const maxCount = Math.min(count, this.cards.length);
        return this.cards.splice(this.cards.length - maxCount);
    }

    peekFront(): Card {
        return this.cards[0];
    }

    empty(): boolean {
        return this.cards.length === 0;
    }

    clear(): void {
        this.cards = [];
    }

    size(): number {
        return this.cards.length;
    }
}