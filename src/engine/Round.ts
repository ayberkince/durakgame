import { Card, CardDto } from './Card';
import * as config from './config';

export interface RoundDto {
    attackCards: CardDto[];
    defenceCards: CardDto[];
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
        if (this.attackCards.length >= this.maxCards) return false;

        if (this.attackCards.length === 0) {
            this.attackCards.push(attackCard);
            return true;
        }

        let hasSameRank = false;
        this.attackCards.forEach((card) => {
            if (attackCard.isSameRank(card)) hasSameRank = true;
        });
        this.defenceCards.forEach((card) => {
            if (attackCard.isSameRank(card)) hasSameRank = true;
        });

        if (!hasSameRank) return false;

        this.attackCards.push(attackCard);
        return true;
    }

    defend(defenceCard: Card): boolean {
        // FIXED: Target the first undefended card, not just the last one!
        const attackCard = this.attackCards[this.defenceCards.length];
        if (attackCard === undefined) return false;

        const isAttackTrump = this.trumpCard ? attackCard.isSameSuite(this.trumpCard) : false;
        const isDefenceTrump = this.trumpCard ? defenceCard.isSameSuite(this.trumpCard) : false;
        const isDefenceHigherRank = defenceCard.isHigherRankThan(attackCard);
        const areSameSuite = defenceCard.isSameSuite(attackCard);

        const isTrumpOverNormal = isDefenceTrump && !isAttackTrump;
        const isHigherNormal = areSameSuite && isDefenceHigherRank;

        const isBeating = isTrumpOverNormal || isHigherNormal;

        if (isBeating) {
            this.defenceCards.push(defenceCard);
            return true;
        }

        return false;
    }

    // --- NEW PEREVODNOY (TRANSFER) LOGIC ---
    canTransfer(transferCard: Card): boolean {
        if (this.defenceCards.length > 0) return false;
        if (this.attackCards.length === 0) return false;

        const currentAttackRank = this.attackCards[0];
        return transferCard.isSameRank(currentAttackRank);
    }

    transferAttack(transferCard: Card): void {
        this.attackCards.push(transferCard);
    }
    // ---------------------------------------

    getAttackCards(): Card[] {
        return this.attackCards;
    }

    getDefenceCards(): Card[] {
        return this.defenceCards;
    }

    isComplete(): boolean {
        return (
            this.attackCards.length === this.maxCards &&
            this.defenceCards.length === this.maxCards
        );
    }

    isEmpty(): boolean {
        return this.attackCards.length === 0 && this.defenceCards.length === 0;
    }

    toObject(): RoundDto {
        return {
            attackCards: this.attackCards.map((card) => card.toObject()),
            defenceCards: this.defenceCards.map((card) => card.toObject()),
        };
    }
}