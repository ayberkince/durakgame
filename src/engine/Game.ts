import assert from 'assert';
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

export interface GameSettings {
    isPerevodnoy: boolean;
    deckSize: 24 | 36 | 52;
    players: number;
    stakes?: number;
}

export interface GameDto {
    players: PlayerDto[];
    state: number;
    trumpCard: CardDto | null;
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
    private trumpCard: Card | null = null;
    private playerList = new PlayerList();
    private handMap: Map<number, Hand> = new Map();
    private passMap: Map<number, boolean> = new Map();
    private attackerId = PLAYER_MISSING_ID;
    private defenderId = PLAYER_MISSING_ID;
    private passerId = PLAYER_MISSING_ID;
    private currentId = PLAYER_MISSING_ID;
    private settings: GameSettings = { isPerevodnoy: false, deckSize: 36, players: 2 };

    constructor() { }

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

        // Initial Deal
        for (let i = 0; i < config.HAND_MAX_CARDS; i++) {
            this.handMap.forEach((hand) => {
                if (this.stock.size() > 0) hand.push(this.stock.pop());
            });
        }

        this.trumpCard = this.stock.peekFront();

        // Select Attacker
        const selectors = [
            new LastLossAttackerSelector(this.playerList, lastLossPlayerId),
            new LowestTrumpAttackerSelector(this.playerList, this.handMap, this.trumpCard)
        ];

        for (const selector of selectors) {
            const id = selector.select();
            if (id !== PLAYER_MISSING_ID) {
                this.updateAttackerId(id);
                break;
            }
        }

        if (this.attackerId === PLAYER_MISSING_ID) this.updateAttackerId(players[0].getId());

        this.resetRound();
        this.state = GameState.Attack;
        return true;
    }

    act(card: Card): boolean {
        const hand = this.handMap.get(this.currentId);
        if (!hand || !hand.has(card)) return false;

        // --- ATTACKER LOGIC ---
        if (this.currentId === this.attackerId || this.currentId === this.passerId) {
            // Rule: Cannot attack with more cards than the round limit (Max 6)
            if (this.round.getAttackCards().length >= this.round.getMaxCards()) return false;

            if (this.state === GameState.Attack || this.state === GameState.Take) {
                if (this.round.attack(card)) {
                    hand.remove(card);
                    this.currentId = this.defenderId; // Move turn to defender
                    this.resetPasses();
                    return true;
                }
            }
        }

        // --- DEFENDER LOGIC ---
        if (this.currentId === this.defenderId) {
            // A. Perevodnoy (Transfer)
            if (this.settings.isPerevodnoy && this.round.canTransfer(card)) {
                const nextId = this.getNextPlayerId(this.defenderId);
                const nextHand = this.handMap.get(nextId);
                const requiredSpace = this.round.getAttackCards().length + 1;

                // Only transfer if the next player has enough cards to defend the increased pile
                if (nextHand && nextHand.size() >= requiredSpace) {
                    if (this.round.transferAttack(card)) {
                        hand.remove(card);
                        this.attackerId = this.defenderId;
                        this.defenderId = nextId;
                        this.currentId = this.defenderId;
                        this.resetPasses();
                        return true;
                    }
                }
            }

            // B. Standard Defense
            // Note: The Round class handles the Trump-check logic internally
            if (this.round.defend(card)) {
                hand.remove(card);

                if (this.round.isComplete()) {
                    this.showcaseRoundDefended();
                } else if (this.round.getDefenceCards().length === this.round.getAttackCards().length) {
                    // All cards currently on table defended, return turn to attackers for more
                    this.currentId = this.attackerId;
                }
                return true;
            }
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

        this.passMap.set(this.currentId, true);
        const nextPasserId = this.getNextPasserId(this.currentId);

        if (nextPasserId === PLAYER_MISSING_ID) {
            if (this.state === GameState.Take) {
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

    private showcaseRoundDefended(): void {
        this.state = GameState.DefenceShowcase;
        this.currentId = this.attackerId;
        this.passerId = this.attackerId;
    }

    private takeDefenceCards(): void {
        const hand = this.handMap.get(this.defenderId);
        if (!hand) return;
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

        // Remove players with empty hands if deck is empty
        Array.from(this.handMap).forEach(([id, hand]) => {
            if (!hand.empty()) return;
            if (nextAttackerId === id) nextAttackerId = this.getNextPlayerId(id);
            this.handMap.delete(id);
            this.playerList.delete(id);
            this.passMap.delete(id);
        });

        this.updateAttackerId(nextAttackerId);
        this.resetRound();
        this.checkEnded();
        this.state = GameState.Attack;
    }

    private refillHands(): void {
        // Correct Durak Refill Order: Attacker -> Other Attackers -> Defender
        let currentRefillId = this.attackerId;
        const totalPlayers = this.playerList.size();

        for (let i = 0; i < totalPlayers; i++) {
            // Skip the defender until the end
            if (currentRefillId !== this.defenderId) {
                const hand = this.handMap.get(currentRefillId);
                if (hand) hand.push(...this.stock.takeBack(hand.tillFullCount()));
            }
            currentRefillId = this.getNextPlayerId(currentRefillId);
        }

        // Finally, refill the defender
        const defenderHand = this.handMap.get(this.defenderId);
        if (defenderHand) defenderHand.push(...this.stock.takeBack(defenderHand.tillFullCount()));
    }

    private resetRound(): boolean {
        const defenderHand = this.handMap.get(this.defenderId);
        if (!defenderHand) return false;

        // Rule: Limit is 6, unless it's the first round (5) or defender has fewer cards
        let limit = config.ROUND_MAX_CARDS; // 6
        if (this.discard.size() === 0) limit = config.SHORT_ROUND_MAX_CARDS; // 5

        const actualLimit = Math.min(limit, defenderHand.size());
        this.round.reset(this.trumpCard, actualLimit);
        return true;
    }

    private checkEnded(): void {
        if (this.playerList.size() <= 1) {
            if (this.playerList.size() === 1) {
                this.playerList.first().addLoss();
            }
            this.state = GameState.Ended;
        }
    }

    // --- Helpers ---
    private updateAttackerId(id: number): void {
        this.attackerId = this.playerList.has(id) ? id : this.getNextPlayerId(id);
        this.defenderId = this.getNextPlayerId(this.attackerId);
        this.passerId = this.attackerId;
        this.currentId = this.attackerId;
    }

    private updatePasserId(id: number): void {
        this.passerId = id;
        this.currentId = id;
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

    private getNextPlayerId(id: number): number { return this.playerList.nextId(id); }
    private resetPasses(): void { this.passMap.forEach((_, id) => this.passMap.set(id, false)); }

    isEnded(): boolean { return this.state === GameState.Ended; }
    getPlayers(): Player[] { return Array.from(this.playerList.players()); }
    getPlayerHand(player: Player): Hand { return this.handMap.get(player.getId()) || new Hand(); }

    toObject(): GameDto {
        return {
            players: this.playerList.players().map(p => p.toObject()),
            state: this.state,
            trumpCard: this.trumpCard?.toObject() ?? null,
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