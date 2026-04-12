import { CardDto } from '../src/engine/Card';

export function formatCard(card: CardDto | null | undefined): string {
    if (!card) return '';

    let rankStr = card.rank.toString();
    if (card.rank === 11) rankStr = 'J';
    if (card.rank === 12) rankStr = 'Q';
    if (card.rank === 13) rankStr = 'K';
    if (card.rank === 14) rankStr = 'A';

    let suiteStr = '';
    if (card.suite === 1) suiteStr = '♣️'; // Clubs
    if (card.suite === 2) suiteStr = '♦️'; // Diamonds
    if (card.suite === 3) suiteStr = '♥️'; // Hearts
    if (card.suite === 4) suiteStr = '♠️'; // Spades

    return `${rankStr} ${suiteStr}`;
}