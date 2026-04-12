"use client";
import React, { useState } from 'react';
import { Game } from '../src/engine/Game';
import { Player } from '../src/engine/Player';

const getSuitSymbol = (suite: number) => ['C', 'D', 'H', 'S'][suite - 1] || '?';
const getRankStr = (rank: number) => ({ 11: 'J', 12: 'Q', 13: 'K', 14: 'A' }[rank as keyof typeof getRankStr] || rank.toString());
const formatCard = (c: any) => c ? `${getRankStr(c.rank)}${getSuitSymbol(c.suite)}` : '';

export default function TestRunner() {
    const [status, setStatus] = useState("Idle");
    const [csvData, setCsvData] = useState<string | null>(null);

    // --- NEW STATE FOR AI ---
    const [aiReport, setAiReport] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const runAllTests = () => {
        setStatus("Running permutations... please wait.");
        setAiReport(null); // Clear old reports

        setTimeout(() => {
            const difficulties = ['easy', 'medium', 'hard'];
            const playerCounts = [2, 3, 4, 5, 6];
            const perevodnoyModes = [false, true];

            let csvLines = ["MatchID,Players,Difficulty,Perevodnoy,TurnNumber,PlayerName,Action,Card,TableState,Error"];
            let matchId = 1;

            for (const diff of difficulties) {
                for (const pCount of playerCounts) {
                    for (const isPerevod of perevodnoyModes) {

                        const game = new Game();
                        const players = Array.from({ length: pCount }).map((_, i) => new Player(i, `Bot_${i}`));

                        // ✅ FIXED DECK SIZE CALCULATION
                        const safeDeckSize = pCount === 6 ? 52 : 36;
                        game.init(players, { isPerevodnoy: isPerevod, deckSize: safeDeckSize });

                        let turnCount = 0;
                        let isHalted = false;

                        while (!game.isEnded() && !isHalted && turnCount < 1500) {
                            turnCount++;
                            const state = game.toObject();
                            const currentBot = players.find(p => p.getId() === state.currentId);
                            if (!currentBot) break;

                            const hand = game.getPlayerHand(currentBot).getCards();
                            const isAttacking = state.state === 1 || state.state === 3;
                            const isTableEmpty = state.round.attackCards.length === 0;

                            let sortedHand = [...hand];
                            if (diff === 'easy') {
                                sortedHand.sort(() => Math.random() - 0.5);
                            } else {
                                sortedHand.sort((a, b) => {
                                    const aIsTrump = a.toObject().suite === state.trumpCard?.suite;
                                    const bIsTrump = b.toObject().suite === state.trumpCard?.suite;
                                    if (aIsTrump && !bIsTrump) return 1;
                                    if (!aIsTrump && bIsTrump) return -1;
                                    return a.toObject().rank - b.toObject().rank;
                                });
                            }

                            let actionTaken = "FAILED";
                            let cardPlayed = "none";
                            let moveMade = false;

                            for (const card of sortedHand) {
                                if (diff === 'hard' && isAttacking && !isTableEmpty) {
                                    if (card.toObject().suite === state.trumpCard?.suite && hand.length > 1) continue;
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
                                    actionTaken = game.take() ? "TOOK" : "ERROR_TAKE";
                                } else {
                                    actionTaken = game.pass() ? "PASSED" : "ERROR_PASS";
                                }
                            }

                            const tableCards = state.round.attackCards.map((c: any) => formatCard(c)).join('|');
                            const errorMsg = actionTaken.includes("ERROR") ? "Engine Rejected Action" : "None";

                            csvLines.push(`${matchId},${pCount},${diff},${isPerevod},${turnCount},${currentBot.getName()},${actionTaken},${cardPlayed},${tableCards},${errorMsg}`);

                            if (actionTaken.includes("ERROR")) isHalted = true;
                        }

                        if (turnCount >= 1500) {
                            csvLines.push(`${matchId},${pCount},${diff},${isPerevod},${turnCount},SYSTEM,CRASH,none,none,Infinite Loop Detected`);
                        }
                        matchId++;
                    }
                }
            }

            const finalCsv = csvLines.join('\n');
            setCsvData(finalCsv);
            setStatus(`Successfully ran ${matchId - 1} full matches!`);
        }, 100);
    };

    const downloadCsv = () => {
        if (!csvData) return;
        const blob = new Blob([csvData], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `durak_test_logs.csv`;
        a.click();
    };

    // --- NEW FUNCTION: Send CSV to Gemini ---
    const askGemini = async () => {
        if (!csvData) return;
        setIsAnalyzing(true);
        try {
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ csvData })
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error);
            setAiReport(data.analysis);
        } catch (err: any) {
            setAiReport(`❌ Error: ${err.message}`);
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-start h-full gap-4 p-4 text-center overflow-y-auto custom-scrollbar">
            <h2 className="text-xl font-bold text-white mt-4">🧪 Headless QA Runner</h2>
            <p className="text-slate-400 text-xs mb-2">
                Simulate all permutations and auto-analyze results with Gemini.
            </p>

            <button onClick={runAllTests} className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg w-full transition-colors">
                ▶ RUN TESTS
            </button>

            <div className="text-sm font-mono text-blue-300">{status}</div>

            {csvData && (
                <div className="flex gap-2 w-full">
                    <button onClick={downloadCsv} className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-4 rounded-xl shadow-lg flex-1 transition-colors text-xs">
                        ⬇️ CSV
                    </button>
                    <button
                        onClick={askGemini}
                        disabled={isAnalyzing}
                        className={`${isAnalyzing ? 'bg-blue-800' : 'bg-blue-600 hover:bg-blue-500'} text-white font-bold py-3 px-4 rounded-xl shadow-lg flex-1 transition-colors text-xs`}
                    >
                        {isAnalyzing ? "🧠 THINKING..." : "✨ ANALYZE WITH AI"}
                    </button>
                </div>
            )}

            {/* AI Report Display Area */}
            {aiReport && (
                <div className="w-full bg-slate-900 border border-slate-700 p-4 rounded-xl text-left mt-2 shadow-inner overflow-x-hidden">
                    <h3 className="text-blue-400 font-bold mb-2 flex items-center gap-2">
                        <span>✨</span> QA Referee Report
                    </h3>
                    <div className="text-slate-300 text-xs whitespace-pre-wrap leading-relaxed">
                        {aiReport}
                    </div>
                </div>
            )}
        </div>
    );
}