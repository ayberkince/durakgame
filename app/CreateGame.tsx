"use client";
import React, { useState } from 'react';

export default function CreateGame({ onStart }: { onStart: (settings: any) => void }) {
    const [players, setPlayers] = useState(2);
    const [deckSize, setDeckSize] = useState(36);
    const [isPerevodnoy, setIsPerevodnoy] = useState(false);
    const [difficulty, setDifficulty] = useState('medium');
    const [autoPlay, setAutoPlay] = useState(false);

    return (
        <div className="flex flex-col gap-6">

            {/* Players Control */}
            <div className="space-y-3">
                <h2 className="text-[10px] tracking-widest text-zinc-500 uppercase font-semibold">Seat Count</h2>
                <div className="flex bg-zinc-900/50 p-1 rounded-xl border border-white/5 shadow-inner">
                    {[2, 3, 4, 5, 6].map(num => (
                        <button key={num} onClick={() => setPlayers(num)}
                            className={`flex-1 py-3 text-sm font-medium rounded-lg transition-all duration-300 ${players === num ? 'bg-zinc-800 text-white shadow-md ring-1 ring-white/10' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >{num}</button>
                    ))}
                </div>
            </div>

            {/* Difficulty Control */}
            <div className="space-y-3">
                <h2 className="text-[10px] tracking-widest text-zinc-500 uppercase font-semibold">AI Intelligence</h2>
                <div className="flex bg-zinc-900/50 p-1 rounded-xl border border-white/5 shadow-inner">
                    {['easy', 'medium', 'hard'].map(level => (
                        <button key={level} onClick={() => setDifficulty(level)}
                            className={`flex-1 py-3 text-xs tracking-wider uppercase font-medium rounded-lg transition-all duration-300 ${difficulty === level ?
                                (level === 'easy' ? 'bg-emerald-900/40 text-emerald-400 ring-1 ring-emerald-500/30' :
                                    level === 'medium' ? 'bg-amber-900/40 text-amber-400 ring-1 ring-amber-500/30' :
                                        'bg-rose-900/40 text-rose-400 ring-1 ring-rose-500/30')
                                : 'text-zinc-500 hover:text-zinc-300'}`}
                        >{level}</button>
                    ))}
                </div>
            </div>

            {/* Deck & Rules Grid */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                    <h2 className="text-[10px] tracking-widest text-zinc-500 uppercase font-semibold">Deck Size</h2>
                    <div className="flex flex-col bg-zinc-900/50 p-1 rounded-xl border border-white/5 shadow-inner">
                        {[24, 36, 52].map(size => (
                            <button key={size} onClick={() => setDeckSize(size)}
                                className={`py-2 text-xs font-medium rounded-lg transition-all duration-300 ${deckSize === size ? 'bg-zinc-800 text-white shadow-md ring-1 ring-white/10' : 'text-zinc-500 hover:text-zinc-300'}`}
                            >{size}</button>
                        ))}
                    </div>
                </div>

                <div className="space-y-3">
                    <h2 className="text-[10px] tracking-widest text-zinc-500 uppercase font-semibold">Ruleset</h2>
                    <div className="flex flex-col bg-zinc-900/50 p-1 rounded-xl border border-white/5 shadow-inner h-full">
                        <button onClick={() => setIsPerevodnoy(false)}
                            className={`flex-1 py-2 flex flex-col items-center justify-center gap-1 rounded-lg transition-all duration-300 ${!isPerevodnoy ? 'bg-zinc-800 text-white shadow-md ring-1 ring-white/10' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            <span className="text-[10px] tracking-wider uppercase">Throw-In</span>
                        </button>
                        <button onClick={() => setIsPerevodnoy(true)}
                            className={`flex-1 py-2 flex flex-col items-center justify-center gap-1 rounded-lg transition-all duration-300 ${isPerevodnoy ? 'bg-zinc-800 text-white shadow-md ring-1 ring-white/10' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            <span className="text-[10px] tracking-wider uppercase">Transfer</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Auto-Tester Toggle */}
            <div className="bg-zinc-900/30 p-4 rounded-2xl border border-white/5 flex justify-between items-center mt-2">
                <div>
                    <h2 className="text-xs font-bold text-zinc-300 tracking-wide">QA Auto-Tester</h2>
                    <p className="text-[10px] text-zinc-500 mt-1">AI plays on your behalf</p>
                </div>
                <button
                    onClick={() => setAutoPlay(!autoPlay)}
                    className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${autoPlay ? 'bg-amber-500' : 'bg-zinc-800'}`}
                >
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform duration-300 shadow-md ${autoPlay ? 'translate-x-7' : 'translate-x-1'}`} />
                </button>
            </div>

            {/* Luxury Start Button */}
            <button
                onClick={() => onStart({ players, deckSize, isPerevodnoy, difficulty, autoPlay })}
                className="mt-4 relative group overflow-hidden rounded-2xl transition-all active:scale-95"
            >
                <div className="absolute inset-0 bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 opacity-80 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative px-6 py-5 flex items-center justify-center gap-3">
                    <span className="text-black font-extrabold tracking-[0.2em] uppercase text-sm">Initialize Game</span>
                    <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </div>
            </button>
        </div>
    );
}