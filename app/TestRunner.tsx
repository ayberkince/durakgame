"use client";
import React, { useState } from 'react';
import { Game } from '../src/engine/Game';
import { Player } from '../src/engine/Player';

const getSuitSymbol = (suite: number) => ['♣️', '♦️', '♥️', '♠️'][suite - 1] || '?';
const getRankStr = (rank: number) => ({ 11: 'J', 12: 'Q', 13: 'K', 14: 'A' }[rank] || rank.toString());
const formatCard = (c: any) => c ? `${getRankStr(c.rank)}${getSuitSymbol(c.suite)}` : '';

export default function TestRunner() {
    const [status, setStatus] = useState("Idle");
    const [csvData, setCsvData] = useState<string | null>(null);
    const [aiReport, setAiReport] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const runAllTests = () => {
        setStatus("🚀 Simulating permutations...");
        setAiReport(null);

        // We use setTimeout to prevent the UI from freezing during the heavy loop
        setTimeout(() => {
            const difficulties = ['easy', 'medium', 'hard'];
            const playerCounts = [2, 3, 4, 5, 6];
            const perevodnoyModes = [false, true];

            let csvLines = ["MatchID,Players,Difficulty,Perevodnoy,Turn,Player,Action,Card,Table,HandSize,Error"];
            let matchId = 1;

            for (const diff of difficulties) {
                for (const pCount of playerCounts) {
                    for (const isPerevod of perevodnoyModes) {
                        const game = new Game();
                        const players = Array.from({ length: pCount }).map((_, i) => new Player(i, `Bot_${i}`));

                        // ✅ FIXED: Included 'players' in GameSettings to satisfy TypeScript
                        const safeDeckSize = pCount >= 5 ? 52 : 36;
                        game.init(players, {
                            isPerevodnoy: isPerevod,
                            deckSize: safeDeckSize as 36 | 52,
                            players: pCount
                        });

                        let turnCount = 0;
                        let isHalted = false;

                        while (!game.isEnded() && !isHalted && turnCount < 1000) {
                            turnCount++;
                            const state = game.toObject();
                            const currentBot = players.find(p => p.getId() === state.currentId);
                            if (!currentBot) break;

                            const hand = game.getPlayerHand(currentBot).getCards();
                            const isAttacking = state.state === 1 || state.state === 3;
                            const isTableEmpty = state.round.attackCards.length === 0;

                            // Bot Decision Logic
                            let sortedHand = [...hand];
                            if (diff === 'easy') {
                                sortedHand.sort(() => Math.random() - 0.5);
                            } else {
                                sortedHand.sort((a, b) => {
                                    const aTrump = a.toObject().suite === state.trumpCard?.suite;
                                    const bTrump = b.toObject().suite === state.trumpCard?.suite;
                                    if (aTrump && !bTrump) return 1;
                                    if (!aTrump && bTrump) return -1;
                                    return a.toObject().rank - b.toObject().rank;
                                });
                            }

                            let actionTaken = "FAILED";
                            let cardPlayed = "none";
                            let moveMade = false;

                            for (const card of sortedHand) {
                                // "Hard" bots save trumps for defense
                                if (diff === 'hard' && isAttacking && !isTableEmpty) {
                                    if (card.toObject().suite === state.trumpCard?.suite && hand.length > 2) continue;
                                }

                                if (game.act(card)) {
                                    moveMade = true;
                                    actionTaken = "PLAYED";
                                    cardPlayed = formatCard(card.toObject());
                                    break;
                                }
                            }

                            if (!moveMade) {
                                if (state.currentId === state.defenderId) {
                                    // ✅ FIXED: Game.ts 'take' and 'pass' now return booleans
                                    actionTaken = game.take() ? "TOOK" : "ERROR_TAKE";
                                } else {
                                    actionTaken = game.pass() ? "PASSED" : "ERROR_PASS";
                                }
                            }

                            const tableState = state.round.attackCards.map((c: any) => formatCard(c)).join('|');
                            const errorMsg = actionTaken.includes("ERROR") ? "Logic Violation" : "None";

                            csvLines.push(`${matchId},${pCount},${diff},${isPerevod},${turnCount},${currentBot.getName()},${actionTaken},${cardPlayed},"${tableState}",${hand.length},${errorMsg}`);

                            if (actionTaken.includes("ERROR")) isHalted = true;
                        }

                        if (turnCount >= 1000) {
                            csvLines.push(`${matchId},${pCount},${diff},${isPerevod},${turnCount},SYSTEM,TIMEOUT,none,none,0,Infinite Loop`);
                        }
                        matchId++;
                    }
                }
            }

            setCsvData(csvLines.join('\n'));
            setStatus(`✅ Simulation Complete: ${matchId - 1} Matches Logged.`);
        }, 100);
    };

    const downloadCsv = () => {
        if (!csvData) return;
        const blob = new Blob([csvData], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `durak_stress_test.csv`;
        a.click();
    };

    const askGemini = async () => {
        if (!csvData) return;
        setIsAnalyzing(true);
        setAiReport("Consulting the QA Oracle...");
        try {
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ csvData })
            });
            const data = await response.json();
            setAiReport(data.analysis || "AI analysis completed with no specific notes.");
        } catch (err) {
            setAiReport("❌ AI Analysis failed. Check server logs.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-start h-full gap-4 p-6 bg-zinc-950 text-white overflow-y-auto">
            <div className="w-full max-w-2xl space-y-6">
                <header className="text-center space-y-2">
                    <h2 className="text-2xl font-black tracking-tighter uppercase italic text-amber-500">Headless QA Runner</h2>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-[0.3em]">Durak Elite Stress Test Protocol</p>
                </header>

                <div className="grid grid-cols-1 gap-4">
                    <button
                        onClick={runAllTests}
                        className="bg-zinc-100 text-black font-black py-4 rounded-2xl hover:bg-white transition-all active:scale-95 text-xs uppercase tracking-widest"
                    >
                        Run All Permutations
                    </button>

                    <div className="bg-zinc-900/50 border border-white/5 p-4 rounded-2xl text-center">
                        <span className="text-[10px] font-mono text-amber-500/80 uppercase">{status}</span>
                    </div>
                </div>

                {csvData && (
                    <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-700">
                        <button onClick={downloadCsv} className="flex-1 bg-zinc-800 text-zinc-300 font-bold py-4 rounded-2xl border border-white/5 text-[10px] uppercase tracking-widest hover:bg-zinc-700 transition-colors">
                            Download CSV
                        </button>
                        <button
                            onClick={askGemini}
                            disabled={isAnalyzing}
                            className="flex-1 bg-amber-600 text-black font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest shadow-lg shadow-amber-600/20 active:scale-95 disabled:opacity-50"
                        >
                            {isAnalyzing ? "Analyzing..." : "Gemini Audit"}
                        </button>
                    </div>
                )}

                {aiReport && (
                    <div className="bg-zinc-900 border border-amber-500/20 p-6 rounded-3xl shadow-2xl animate-in zoom-in-95 duration-500">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                            <h3 className="text-xs font-black uppercase tracking-widest text-amber-500">QA Referee Report</h3>
                        </div>
                        <div className="text-zinc-300 text-xs leading-relaxed font-medium whitespace-pre-wrap selection:bg-amber-500/30">
                            {aiReport}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}