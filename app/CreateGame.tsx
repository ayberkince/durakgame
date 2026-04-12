"use client";
import React, { useState } from 'react';

export default function CreateGame({ onStart }: { onStart: (settings: any) => void }) {
    const [players, setPlayers] = useState(2);
    const [deckSize, setDeckSize] = useState(36);
    const [isPerevodnoy, setIsPerevodnoy] = useState(false);
    const [difficulty, setDifficulty] = useState('medium');
    const [autoPlay, setAutoPlay] = useState(false); // <-- New AutoPlay State

    return (
        <div className="flex flex-col gap-5">
            {/* Players Selector */}
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                <h2 className="text-sm text-slate-400 mb-3 text-center">Players</h2>
                <div className="flex justify-between bg-slate-900 rounded-lg p-1">
                    {[2, 3, 4, 5, 6].map(num => (
                        <button key={num} onClick={() => setPlayers(num)}
                            className={`flex-1 py-2 text-center rounded-md text-sm font-bold transition-all ${players === num ? 'bg-blue-500 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                        >{num}</button>
                    ))}
                </div>
            </div>

            {/* Bot Difficulty Selector */}
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                <h2 className="text-sm text-slate-400 mb-3 text-center">Bot Difficulty</h2>
                <div className="flex justify-between bg-slate-900 rounded-lg p-1">
                    {['easy', 'medium', 'hard'].map(level => (
                        <button key={level} onClick={() => setDifficulty(level)}
                            className={`flex-1 py-2 text-center rounded-md text-sm font-bold capitalize transition-all ${difficulty === level ?
                                (level === 'easy' ? 'bg-green-500' : level === 'medium' ? 'bg-yellow-500' : 'bg-red-500') + ' text-white shadow-md'
                                : 'text-slate-400 hover:text-white'}`}
                        >{level}</button>
                    ))}
                </div>
            </div>

            {/* Deck Size Selector */}
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                <div className="flex justify-between bg-slate-900 rounded-lg p-1">
                    {[24, 36, 52].map(size => (
                        <button key={size} onClick={() => setDeckSize(size)}
                            className={`flex-1 py-2 text-center rounded-md text-sm font-bold transition-all ${deckSize === size ? 'bg-pink-500 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                        >{size} Cards</button>
                    ))}
                </div>
            </div>

            {/* Game Modes */}
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setIsPerevodnoy(false)}
                        className={`p-3 rounded-lg border flex flex-col items-center justify-center transition-all ${!isPerevodnoy ? 'border-blue-500 bg-blue-500/20' : 'border-slate-700 bg-slate-900 text-slate-400'}`}
                    >
                        <span className="text-2xl mb-1">➡️</span>
                        <span className="text-xs font-bold">Throw-in</span>
                    </button>
                    <button onClick={() => setIsPerevodnoy(true)}
                        className={`p-3 rounded-lg border flex flex-col items-center justify-center transition-all ${isPerevodnoy ? 'border-blue-500 bg-blue-500/20' : 'border-slate-700 bg-slate-900 text-slate-400'}`}
                    >
                        <span className="text-2xl mb-1">🔄</span>
                        <span className="text-xs font-bold">Passing</span>
                    </button>
                </div>
            </div>

            {/* 🤖 NEW: Auto-Tester Toggle */}
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex justify-between items-center">
                <div>
                    <h2 className="text-sm font-bold text-slate-300">🤖 Expert Auto-Tester</h2>
                    <p className="text-xs text-slate-500">AI plays for you and reports errors</p>
                </div>
                <button
                    onClick={() => setAutoPlay(!autoPlay)}
                    className={`w-14 h-8 rounded-full relative transition-colors ${autoPlay ? 'bg-green-500' : 'bg-slate-700'}`}
                >
                    <div className={`w-6 h-6 bg-white rounded-full absolute top-1 transition-transform ${autoPlay ? 'translate-x-7' : 'translate-x-1'}`} />
                </button>
            </div>

            <button
                // Notice the autoPlay variable is now passed to the engine!
                onClick={() => onStart({ players, deckSize, isPerevodnoy, difficulty, autoPlay })}
                className="mt-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold py-4 rounded-xl shadow-lg transition-all active:scale-95 hover:brightness-110"
            >
                START LOCAL GAME ▶
            </button>
        </div>
    );
}