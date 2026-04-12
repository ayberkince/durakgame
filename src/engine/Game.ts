import * as assert from 'assert';
import { LastLossAttackerSelector } from './game/LastLossAttackerSelector';
import { LowestTrumpAttackerSelector } from './game/LowestTrumpAttackerSelector';
import { Card, CardDto } from './Card';
import { Deck } from './Deck';
import { Hand } from './Hand';
import { Round, RoundDto } from './Round';
import { Player, PlayerDto, PLAYER_MISSING_ID } from './Player';
import { PlayerList } from './PlayerList';
import * as config from './config';

export enum GameState {
    Idle = 0,
    Attack = 1,
    Take = 2,
    DefenceShowcase = 3,
    Ended = 4,
}

// --- NEW SETTINGS INTERFACE ---
export interface GameSettings {
    isPerevodnoy: boolean;
    deckSize: 24 | 36 | 52;
}

export interface GameDto {
    players: PlayerDto[];
    state: number;
    trumpCard: CardDto;
    stockCount: number;
    discardCount: number;
    attackerId: number;
    defenderId: number;
    passerId: number;
    currentId: number;
    round: RoundDto;
}

export class Game {
    private state = GameState.Idle;
    private stock = new Deck();
    private discard = new Deck();
    private round = new Round();
    private trumpCard: Card = null;
    private playerList = new PlayerList();
    private handMap: Map<number, Hand> = new Map();
    private passMap: Map<number, boolean> = new Map();
    private attackerId = PLAYER_MISSING_ID;
    private defenderId = PLAYER_MISSING_ID;
    private passerId = PLAYER_MISSING_ID;
    private currentId = PLAYER_MISSING_ID;

    // Initialize with default settings
    private settings: GameSettings = { isPerevodnoy: false, deckSize: 36 };

    constructor() { }

    clear(): void {
        this.state = GameState.Idle;
        this.stock.clear();
        this.discard.clear();
        this.round.clear();
        this.trumpCard = null;
        this.playerList.clear();
        this.handMap.clear();
        this.passMap.clear();
        this.attackerId = PLAYER_MISSING_ID;
        this.defenderId = PLAYER_MISSING_ID;
        this.passerId = PLAYER_MISSING_ID;
        this.currentId = PLAYER_MISSING_ID;
    }

    // Updated Init with GameSettings
    init(players: Player[], settings: GameSettings, lastLossPlayerId = PLAYER_MISSING_ID): boolean {
        if (this.state !== GameState.Idle) return false;

        this.settings = settings;
        this.playerList.reset(players);

        players.forEach((player) => {
            this.handMap.set(player.getId(), new Hand());
            this.passMap.set(player.getId(), false);
        });

        this.stock = new Deck(settings.deckSize);
        this.stock.refill();
        this.stock.shuffle();
        this.discard = new Deck();

        assert(
            this.stock.size() > this.handMap.size * config.HAND_MAX_CARDS,
            'Stock must have more cards than sum of all hands',
        );

        for (let cardIndex = 0; cardIndex < config.HAND_MAX_CARDS; cardIndex++) {
            this.handMap.forEach((hand) => {
                const card = this.stock.pop();
                hand.push(card);
            });
        }

        this.trumpCard = this.stock.peekFront();

        const attackerSelectors = [];
        attackerSelectors.push(new LastLossAttackerSelector(this.playerList, lastLossPlayerId));
        attackerSelectors.push(new LowestTrumpAttackerSelector(this.playerList, this.handMap, this.trumpCard));

        for (const selector of attackerSelectors) {
            const attackerId = selector.select();
            if (attackerId !== PLAYER_MISSING_ID) {
                this.updateAttackerId(attackerId);
                break;
            }
        }

        assert(this.attackerId !== PLAYER_MISSING_ID, 'Attacker must be selected');
        this.resetRound();
        this.state = GameState.Attack;

        return true;
    }

    act(card: Card): boolean {
        if (this.currentId === this.attackerId || this.currentId === this.passerId) {
            if (this.state === GameState.Attack) {
                const attackerHand = this.handMap.get(this.currentId);
                if (!attackerHand.has(card)) return false;

                const hasAttacked = this.round.attack(card);
                if (!hasAttacked) return false;

                attackerHand.remove(card);
                this.currentId = this.defenderId;
                this.resetPasses();
                return true;
            }

            if (this.state === GameState.Take) {
                const passerHand = this.handMap.get(this.currentId);
                if (!passerHand.has(card)) return false;

                const hasAttacked = this.round.attack(card);
                if (!hasAttacked) return false;

                passerHand.remove(card);
                return true;
            }
        }

        // DEFENDER LOGIC (UPDATED WITH PEREVODNOY)
        // DEFENDER LOGIC (UPDATED WITH PEREVODNOY)
        if (this.currentId === this.defenderId) {
            const defenderHand = this.handMap.get(this.defenderId);
            if (!defenderHand.has(card)) return false;

            // Transfer Check
            if (this.settings.isPerevodnoy) {
                if (this.round.canTransfer(card)) {
                    const nextPlayerId = this.getNextPlayerId(this.defenderId);
                    const nextPlayerHand = this.handMap.get(nextPlayerId);
                    const totalAttackCards = this.round.getAttackCards().length + 1;

                    if (nextPlayerHand.size() >= totalAttackCards) {
                        this.round.transferAttack(card);
                        defenderHand.remove(card);

                        this.attackerId = this.defenderId;
                        this.defenderId = nextPlayerId;
                        this.currentId = this.defenderId;

                        this.resetPasses();
                        return true;
                    }
                }
            }

            // Standard Defense
            const hasDefended = this.round.defend(card);
            if (!hasDefended) return false;

            defenderHand.remove(card);

            if (this.round.isComplete()) {
                this.showcaseRoundDefended();
                return true;
            }

            // FIXED: Only pass the turn back to the attacker if ALL attack cards are answered!
            if (this.round.getDefenceCards().length === this.round.getAttackCards().length) {
                this.currentId = this.passerId;
            }

            return true;
        }

        return false;
    }

    take(): boolean {
        if (this.currentId !== this.defenderId) return false;
        this.state = GameState.Take;
        this.currentId = this.attackerId;
        this.passerId = this.attackerId;
        return true;
    }

    pass(): boolean {
        if (this.currentId !== this.attackerId && this.currentId !== this.passerId) return false;

        if (this.state === GameState.Attack) {
            this.passMap.set(this.currentId, true);
            const nextPasserId = this.getNextPasserId(this.currentId);

            if (nextPasserId === PLAYER_MISSING_ID) {
                this.discardDefenceCards();
                this.finishRound(this.defenderId);
                return true;
            }

            this.updatePasserId(nextPasserId);
            return true;
        }

        if (this.state === GameState.Take || this.state === GameState.DefenceShowcase) {
            this.passMap.set(this.currentId, true);
            const nextPasserId = this.getNextPasserId(this.currentId);

            if (nextPasserId === PLAYER_MISSING_ID) {
                const prevState = this.state;
                this.state = GameState.Attack;

                if (prevState === GameState.Take) {
                    this.takeDefenceCards();
                    this.finishRound(this.getNextPlayerId(this.defenderId));
                } else {
                    this.discardDefenceCards();
                    this.finishRound(this.defenderId);
                }
                return true;
            }

            this.updatePasserId(nextPasserId);
            return true;
        }

        return false;
    }

    private showcaseRoundDefended(): void {
        if (this.state !== GameState.Attack) return;
        if (this.currentId !== this.defenderId) return;

        this.state = GameState.DefenceShowcase;
        this.currentId = this.attackerId;
        this.passerId = this.attackerId;
    }

    private takeDefenceCards(): void {
        const hand = this.handMap.get(this.defenderId);
        hand.push(...this.round.getAttackCards());
        hand.push(...this.round.getDefenceCards());
    }

    private discardDefenceCards(): void {
        this.discard.push(...this.round.getAttackCards());
        this.discard.push(...this.round.getDefenceCards());
    }

    private finishRound(expectedAttackerId: number): void {
        this.resetPasses();
        this.refillHands();

        let nextAttackerId = expectedAttackerId;

        Array.from(this.handMap).forEach(([id, hand]) => {
            if (!hand.empty()) return;

            if (nextAttackerId === id) {
                nextAttackerId = this.getNextPlayerId(id);
            }

            this.handMap.delete(id);
            this.playerList.delete(id);
            this.passMap.delete(id);
        });

        this.updateAttackerId(nextAttackerId);
        this.resetRound();
        this.checkEnded();
    }

    private refillHands(): void {
        let attackerId = this.attackerId;

        this.handMap.forEach(() => {
            if (attackerId === this.defenderId) {
                attackerId = this.getNextPlayerId(attackerId);
                return;
            }

            const hand = this.handMap.get(attackerId);
            const fillCards = this.stock.takeBack(hand.tillFullCount());
            hand.push(...fillCards);

            attackerId = this.getNextPlayerId(attackerId);
        });

        const defenderHand = this.handMap.get(this.defenderId);
        const defenderFillCards = this.stock.takeBack(defenderHand.tillFullCount());
        defenderHand.push(...defenderFillCards);
    }

    private resetRound(): boolean {
        const defenderHand = this.handMap.get(this.defenderId);
        if (!defenderHand) return false;

        let roundMaxCards = config.ROUND_MAX_CARDS;
        if (this.discard.size() === 0) {
            roundMaxCards = config.SHORT_ROUND_MAX_CARDS;
        }
        if (roundMaxCards > defenderHand.size()) {
            roundMaxCards = defenderHand.size();
        }

        this.round.reset(this.trumpCard, roundMaxCards);
        return true;
    }

    private checkEnded(): void {
        if (this.state === GameState.Idle || this.state === GameState.Ended) return;
        if (this.playerList.size() > 1) return;

        if (this.playerList.size() === 1) {
            const player = this.playerList.first();
            player.addLoss();
            this.round.clear();
            this.state = GameState.Ended;
            return;
        }

        this.round.clear();
        this.state = GameState.Ended;
        return;
    }

    private updateAttackerId(expectedAttackerId: number): void {
        if (this.playerList.has(expectedAttackerId)) {
            this.attackerId = expectedAttackerId;
        } else {
            this.attackerId = this.getNextPlayerId(expectedAttackerId);
        }
        this.passerId = this.attackerId;
        this.defenderId = this.getNextPlayerId(this.attackerId);
        this.currentId = this.attackerId;
    }

    private updatePasserId(passerId): void {
        this.passerId = passerId;
        this.currentId = this.passerId;
    }

    private getNextPasserId(startId: number): number {
        const ids = Array.from(this.passMap.keys());
        let index = ids.indexOf(startId);

        for (let i = 0; i < ids.length; i++) {
            index = (index + 1) % ids.length;
            const id = ids[index];
            if (id === this.defenderId) continue;
            if (!this.passMap.get(id)) return id;
        }
        return PLAYER_MISSING_ID;
    }

    private getNextPlayerId(id: number): number {
        return this.playerList.nextId(id);
    }

    private resetPasses(): void {
        this.passMap.forEach((pass, id) => {
            this.passMap.set(id, false);
        });
    }

    isEnded(): boolean {
        return this.state === GameState.Ended;
    }

    isEndedInLoss(): boolean {
        return this.isEnded() && this.playerList.size() === 1;
    }

    getPlayers(): Player[] {
        return Array.from(this.playerList.players());
    }

    getPlayerHand(player: Player): Hand {
        const id = player.getId();
        if (!this.handMap.has(id)) return new Hand();
        return this.handMap.get(id);
    }

    getTrumpCard(): Card {
        return this.trumpCard;
    }

    getStockCount(): number {
        return this.stock.size();
    }

    getDiscardCount(): number {
        return this.discard.size();
    }

    toObject(): GameDto {
        return {
            players: this.playerList.players().map((player) => player.toObject()),
            state: this.state,
            trumpCard: this.trumpCard?.toObject(),
            stockCount: this.stock.size(),
            discardCount: this.discard.size(),
            attackerId: this.attackerId,
            defenderId: this.defenderId,
            passerId: this.passerId,
            currentId: this.currentId,
            round: this.round.toObject(),
        };
    }
}