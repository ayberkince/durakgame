import { useState, useEffect, useRef } from 'react';
import { Game } from '../src/engine/Game';
import { Player } from '../src/engine/Player';
import { Card } from '../src/engine/Card';

// Helper to make log reading easier
const getSuitSymbol = (suite: number) => ['♣️', '♦️', '♥️', '♠️'][suite - 1] || '?';
const getRankString = (rank: number) => ({ 11: 'J', 12: 'Q', 13: 'K', 14: 'A' }[rank as keyof typeof getRankString] || rank.toString());
const formatCardLog = (c: any) => c ? `${getRankString(c.rank)}${getSuitSymbol(c.suite)}` : '';

export function useDurak(settings: any) {
    const gameRef = useRef(new Game());
    const [gameState, setGameState] = useState<any>(null);

    const [report, setReport] = useState<string[]>([]);
    const turnSafetyCounter = useRef(0);
    const [isHalted, setIsHalted] = useState(false); // Stops the loop if a crash happens

    const HUMAN_ID = 0;

    useEffect(() => {
        const playersList = [new Player(HUMAN_ID, "You (Expert Bot)")];
        for (let i = 1; i < settings.players; i++) {
            playersList.push(new Player(i, `Bot ${i}`));
        }
        const engineSettings = { isPerevodnoy: settings.isPerevodnoy, deckSize: settings.deckSize };
        gameRef.current.init(playersList, engineSettings);
        setGameState(gameRef.current.toObject());
        setReport(["[SYSTEM] Game Initialized."]);
        turnSafetyCounter.current = 0;
        setIsHalted(false);
    }, [settings]);

    const addLog = (msg: string) => setReport(prev => [...prev, msg]);

    // The Crash Dump Generator
    const generateCrashDump = (stateObj: any, hand: any[]) => {
        setIsHalted(true); // Stop the simulation
        addLog(`🕵️ --- CRASH DUMP ---`);
        addLog(`Phase: ${stateObj.state} (1=Attack, 2=Take, 3=DefShowcase, 4=End)`);
        addLog(`IDs -> Attacker: ${stateObj.attackerId} | Defender: ${stateObj.defenderId} | Current: ${stateObj.currentId}`);
        addLog(`Table Attack: [${stateObj.round.attackCards.map(formatCardLog).join(', ')}]`);
        addLog(`Table Defence: [${stateObj.round.defenceCards.map(formatCardLog).join(', ')}]`);
        addLog(`Current Hand: [${hand.map((c: any) => formatCardLog(c.toObject())).join(', ')}]`);
        addLog(`Check browser console (F12) for the full JSON dump!`);
        console.error("🔥 CRITICAL DURAK ERROR FULL DUMP:", JSON.parse(JSON.stringify(stateObj)));
    };

    useEffect(() => {
        if (!gameState || isHalted) return;
        if (gameState.state === 4) {
            addLog(`🏆 [SYSTEM] Game finished successfully! Total turns: ${turnSafetyCounter.current}`);
            setIsHalted(true);
            return;
        }

        const isHumanTurn = gameState.currentId === HUMAN_ID;
        if (isHumanTurn && !settings.autoPlay) return;

        turnSafetyCounter.current += 1;

        const delay = settings.autoPlay ? 50 : 1000;

        const botTimer = setTimeout(() => {
            const players = gameRef.current.getPlayers();
            const activeBot = players.find(p => p.getId() === gameState.currentId);
            if (!activeBot) return;

            let botHand = gameRef.current.getPlayerHand(activeBot).getCards();
            let moveMade = false;

            const difficulty = isHumanTurn ? 'hard' : (settings.difficulty || 'medium');
            const isAttacking = gameState.state === 1 || gameState.state === 3;

            // 🧠 THE FIX: Check if the table is completely empty!
            const isTableEmpty = gameState.round.attackCards.length === 0;

            let sortedHand = [...botHand];
            if (difficulty === 'easy') {
                sortedHand.sort(() => Math.random() - 0.5);
            } else {
                sortedHand.sort((a, b) => {
                    const aIsTrump = a.toObject().suite === gameState.trumpCard?.suite;
                    const bIsTrump = b.toObject().suite === gameState.trumpCard?.suite;
                    if (aIsTrump && !bIsTrump) return 1;
                    if (!aIsTrump && bIsTrump) return -1;
                    return a.toObject().rank - b.toObject().rank;
                });
            }

            // INFINITE LOOP TRAP
            if (turnSafetyCounter.current > 500) {
                addLog("❌ [CRITICAL ERROR] Infinite loop detected! Engine frozen.");
                generateCrashDump(gameState, botHand);
                return;
            }

            for (const card of sortedHand) {
                // 🛑 FIXED HARD MODE: Only hoard Trumps if we are THROWING IN (!isTableEmpty).
                if (difficulty === 'hard' && isAttacking && !isTableEmpty) {
                    const isTrump = card.toObject().suite === gameState.trumpCard?.suite;
                    if (isTrump && botHand.length > 1) continue;
                }

                if (gameRef.current.act(card)) {
                    if (settings.autoPlay) addLog(`[T-${turnSafetyCounter.current}] ${activeBot.getName()} played ${formatCardLog(card.toObject())}`);
                    moveMade = true;
                    break;
                }
            }

            if (!moveMade) {
                if (gameState.currentId === gameState.defenderId) {
                    const success = gameRef.current.take();
                    if (settings.autoPlay) addLog(`[T-${turnSafetyCounter.current}] ${activeBot.getName()} TOOK the cards.`);
                    if (!success) {
                        addLog("❌ [ERROR] Engine rejected a valid TAKE action!");
                        generateCrashDump(gameState, botHand);
                        return;
                    }
                } else {
                    const success = gameRef.current.pass();
                    if (settings.autoPlay) addLog(`[T-${turnSafetyCounter.current}] ${activeBot.getName()} PASSED.`);
                    if (!success) {
                        addLog("❌ [ERROR] Engine rejected a valid PASS action!");
                        generateCrashDump(gameState, botHand);
                        return;
                    }
                }
            }

            setGameState(gameRef.current.toObject());
        }, delay);

        return () => clearTimeout(botTimer);
    }, [gameState, settings.autoPlay, settings.difficulty, isHalted]);

    const playCard = (cardDto: any) => {
        if (gameState.currentId !== HUMAN_ID || settings.autoPlay || isHalted) return false;

        const card = new Card(cardDto.suite, cardDto.rank);
        const success = gameRef.current.act(card);

        if (success) {
            setGameState(gameRef.current.toObject());
            return true; // TELL THE UI IT WORKED
        }

        return false; // TELL THE UI IT FAILED!
    };

    const passOrTake = () => {
        if (gameState.currentId !== HUMAN_ID || settings.autoPlay || isHalted) return;
        let success = false;
        if (gameState.currentId === gameState.defenderId) success = gameRef.current.take();
        else success = gameRef.current.pass();
        if (success) setGameState(gameRef.current.toObject());
    };

    return { game: gameRef.current, gameState, playCard, passOrTake, HUMAN_ID, report, autoPlay: settings.autoPlay };
}