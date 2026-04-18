import { Card, CardDto } from './Card';
import * as config from './config';

export interface RoundDto {
    attackCards: CardDto[];
    defenceCards: CardDto[];
    maxCards: number;
}

export class Round {
    private trumpCard: Card | null = null;
    private attackCards: Card[] = [];
    private defenceCards: Card[] = [];
    private maxCards: number = config.ROUND_MAX_CARDS;

    reset(trumpCard: Card | null, maxCards: number): void {
        this.trumpCard = trumpCard;
        this.attackCards = [];
        this.defenceCards = [];
        this.maxCards = maxCards;
    }

    clear(): void {
        this.trumpCard = null;
        this.attackCards = [];
        this.defenceCards = [];
        this.maxCards = config.ROUND_MAX_CARDS;
    }

    attack(attackCard: Card): boolean {
        // 1. Check Round Capacity (6-card limit or Defender hand size)
        if (this.attackCards.length >= this.maxCards) return false;

        // 2. First card of the round is always legal
        if (this.attackCards.length === 0) {
            this.attackCards.push(attackCard);
            return true;
        }

        // 3. Subsequent cards must match the rank of ANY card already on the table
        const tableCards = [...this.attackCards, ...this.defenceCards];
        const hasMatchingRank = tableCards.some(card => attackCard.isSameRank(card));

        if (!hasMatchingRank) return false;

        this.attackCards.push(attackCard);
        return true;
    }

    defend(defenceCard: Card): boolean {
        // Find the specific card we are supposed to be defending against
        const targetIndex = this.defenceCards.length;
        const attackCard = this.attackCards[targetIndex];

        // If no attack card exists at this index, defense is impossible
        if (!attackCard || !this.trumpCard) return false;

        const isAttackTrump = attackCard.isSameSuite(this.trumpCard);
        const isDefenceTrump = defenceCard.isSameSuite(this.trumpCard);

        // --- THE TRUMP LADDER ---

        // Case A: Attacker played a Trump
        if (isAttackTrump) {
            // Defender MUST play a higher Trump
            if (isDefenceTrump && defenceCard.isHigherRankThan(attackCard)) {
                this.defenceCards.push(defenceCard);
                return true;
            }
            return false;
        }

        // Case B: Attacker played a Normal Card, Defender plays a Trump
        if (isDefenceTrump) {
            // Any Trump beats a non-Trump
            this.defenceCards.push(defenceCard);
            return true;
        }

        // Case C: Both are Normal Cards
        if (defenceCard.isSameSuite(attackCard) && defenceCard.isHigherRankThan(attackCard)) {
            this.defenceCards.push(defenceCard);
            return true;
        }

        // All other cases (different suits, lower ranks) are illegal
        return false;
    }

    // --- PEREVODNOY (TRANSFER) LOGIC ---
    canTransfer(transferCard: Card): boolean {
        // Transfer is only allowed if the defender hasn't started defending yet
        if (this.defenceCards.length > 0) return false;

        // Must have at least one card to transfer
        if (this.attackCards.length === 0) return false;

        // The card used to transfer must match the rank of the current attack
        return transferCard.isSameRank(this.attackCards[0]);
    }

    transferAttack(transferCard: Card): boolean {
        this.attackCards.push(transferCard);
        return true;
    }

    // --- GETTERS & STATE ---
    getAttackCards(): Card[] { return this.attackCards; }
    getDefenceCards(): Card[] { return this.defenceCards; }
    getMaxCards(): number { return this.maxCards; }

    isComplete(): boolean {
        // Round is complete if we hit the limit AND all attacks are defended
        return (
            this.attackCards.length === this.maxCards &&
            this.defenceCards.length === this.maxCards
        );
    }

    // New helper to check if the current wave is fully answered
    allCurrentAttacksDefended(): boolean {
        return this.attackCards.length === this.defenceCards.length;
    }

    isEmpty(): boolean {
        return this.attackCards.length === 0 && this.defenceCards.length === 0;
    }

    toObject(): RoundDto {
        return {
            attackCards: this.attackCards.map((card) => card.toObject()),
            defenceCards: this.defenceCards.map((card) => card.toObject()),
            maxCards: this.maxCards
        };
    }
}