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
    players: number; // Added to sync with CreateGame settings
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

        // Deal cards
        for (let cardIndex = 0; cardIndex < config.HAND_MAX_CARDS; cardIndex++) {
            this.handMap.forEach((hand) => {
                if (this.stock.size() > 0) {
                    const card = this.stock.pop();
                    hand.push(card);
                }
            });
        }

        this.trumpCard = this.stock.peekFront();

        // Selection Logic
        const attackerSelectors = [
            new LastLossAttackerSelector(this.playerList, lastLossPlayerId),
            new LowestTrumpAttackerSelector(this.playerList, this.handMap, this.trumpCard)
        ];

        for (const selector of attackerSelectors) {
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

        // 1. ATTACKER/PASSER LOGIC
        if (this.currentId === this.attackerId || this.currentId === this.passerId) {
            // Check Round Limit (The 6-Card Rule)
            if (this.round.getAttackCards().length >= this.round.getMaxCards()) {
                return false;
            }

            if (this.state === GameState.Attack || this.state === GameState.Take) {
                if (this.round.attack(card)) {
                    hand.remove(card);
                    // Turn moves to defender to answer the card
                    this.currentId = this.defenderId;
                    this.resetPasses();
                    return true;
                }
            }
        }

        // 2. DEFENDER LOGIC
        if (this.currentId === this.defenderId) {
            // A. Transfer (Perevodnoy)
            if (this.settings.isPerevodnoy && this.round.canTransfer(card)) {
                const nextId = this.getNextPlayerId(this.defenderId);
                const nextHand = this.handMap.get(nextId);
                const attackCount = this.round.getAttackCards().length + 1;

                if (nextHand && nextHand.size() >= attackCount) {
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
            if (this.round.defend(card)) {
                hand.remove(card);

                // If round is full and all defended
                if (this.round.isComplete()) {
                    this.showcaseRoundDefended();
                } else if (this.round.getDefenceCards().length === this.round.getAttackCards().length) {
                    // All currently played cards are defended, give turn back to attacker to add more
                    this.currentId = this.attackerId;
                }
                return true;
            }
        }

        return false;
    }

    // ... (rest of the methods: take, pass, resetRound, etc. remain the same)
    // IMPORTANT: Ensure resetRound() uses the 6-card limit correctly

    private resetRound(): boolean {
        const defenderHand = this.handMap.get(this.defenderId);
        if (!defenderHand) return false;

        // Standard Durak: Max cards in round is 6, OR the defender's hand size
        let roundMaxCards = 6;

        // First round of the game is usually limited to 5 cards in some variations
        if (this.discard.size() === 0) {
            roundMaxCards = 5;
        }

        // You can never throw more cards than the defender has
        const actualLimit = Math.min(roundMaxCards, defenderHand.size());

        this.round.reset(this.trumpCard, actualLimit);
        return true;
    }

    // ... (Keep existing private helper methods)
}