"use client";
import React, { useState } from 'react';
import { socket } from './socket';

export default function CreateGame({ onStart }: { onStart: (settings: any) => void }) {
    const [mode, setMode] = useState<'single' | 'multi'>('single');
    const [players, setPlayers] = useState(2);
    const [deckSize, setDeckSize] = useState(36);
    const [isPerevodnoy, setIsPerevodnoy] = useState(false);
    const [difficulty, setDifficulty] = useState('medium');
    const [autoPlay, setAutoPlay] = useState(false);
    const [stakes, setStakes] = useState(1000); // NEW: Economy Integration

    const handleCreateRoom = () => {
        const settings = {
            mode,
            players,
            deckSize,
            isPerevodnoy,
            difficulty,
            autoPlay,
            stakes // Sending stakes to the server
        };

        socket.emit('create_room', settings, (response: any) => {
            console.log("📩 Server Response:", response); // Check your browser console!
            if (response.success) {
                if (mode === 'single') {
                    onStart({ ...settings, roomId: response.roomId });
                } else {
                    onStart('go_to_lobby');
                }
            } else {
                // THIS WILL TELL US THE ERROR
                alert("🚨 PROTOCOL ERROR: " + (response.error || "Unknown Server Error"));
            }
        });
    };

    return (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* MATCH STAKES (ECONOMY HOOK) */}
            <div className="space-y-3">
                <h2 className="text-[10px] tracking-widest text-amber-500/60 uppercase font-black">Contract Stakes</h2>
                <div className="grid grid-cols-3 bg-zinc-900/50 p-1 rounded-xl border border-white/5 shadow-inner">
                    {[100, 1000, 10000].map(val => (
                        <button key={val} onClick={() => setStakes(val)}
                            className={`py-3 text-[10px] font-black uppercase tracking-tighter rounded-lg transition-all ${stakes === val ? 'bg-amber-600 text-black shadow-lg shadow-amber-600/20' : 'text-zinc-600 hover:text-zinc-400'}`}
                        >
                            ${val >= 1000 ? `${val / 1000}k` : val}
                        </button>
                    ))}
                </div>
            </div>

            {/* GAME MODE SELECTOR */}
            <div className="space-y-3">
                <h2 className="text-[10px] tracking-widest text-zinc-500 uppercase font-bold">Protocol</h2>
                <div className="flex bg-zinc-900/50 p-1 rounded-xl border border-white/5">
                    <button onClick={() => setMode('single')}
                        className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-2 ${mode === 'single' ? 'bg-zinc-800 text-white shadow-md ring-1 ring-white/10' : 'text-zinc-600'}`}
                    >
                        <span>🤖</span> Artificial
                    </button>
                    <button onClick={() => setMode('multi')}
                        className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-2 ${mode === 'multi' ? 'bg-zinc-800 text-white shadow-md ring-1 ring-white/10' : 'text-zinc-600'}`}
                    >
                        <span>🌐</span> Network
                    </button>
                </div>
            </div>

            {/* Seat Count (Optimized for 1-5 bots) */}
            <div className="space-y-3">
                <h2 className="text-[10px] tracking-widest text-zinc-500 uppercase font-bold">Table Capacity</h2>
                <div className="flex bg-zinc-900/50 p-1 rounded-xl border border-white/5">
                    {[2, 3, 4, 5, 6].map(num => (
                        <button key={num} onClick={() => setPlayers(num)}
                            className={`flex-1 py-3 text-xs font-black rounded-lg transition-all ${players === num ? 'bg-zinc-800 text-amber-500 shadow-md ring-1 ring-white/10' : 'text-zinc-600 hover:text-zinc-400'}`}
                        >{num}</button>
                    ))}
                </div>
            </div>

            {/* AI Intelligence (Only visible in single mode) */}
            <div className={`space-y-3 transition-all duration-500 ${mode === 'single' ? 'opacity-100' : 'opacity-20 pointer-events-none'}`}>
                <h2 className="text-[10px] tracking-widest text-zinc-500 uppercase font-bold">Bot Algorithms</h2>
                <div className="flex bg-zinc-900/50 p-1 rounded-xl border border-white/5">
                    {['easy', 'medium', 'hard'].map(level => (
                        <button key={level} onClick={() => setDifficulty(level)}
                            className={`flex-1 py-3 text-[10px] tracking-widest uppercase font-black rounded-lg transition-all ${difficulty === level ? 'bg-zinc-800 text-white shadow-md ring-1 ring-white/10' : 'text-zinc-600'}`}
                        >{level}</button>
                    ))}
                </div>
            </div>

            {/* Deck & Ruleset Grid */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                    <h2 className="text-[10px] tracking-widest text-zinc-500 uppercase font-bold">Asset Count</h2>
                    <div className="flex bg-zinc-900/50 p-1 rounded-xl border border-white/5">
                        {[24, 36, 52].map(size => (
                            <button key={size} onClick={() => setDeckSize(size)}
                                className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all ${deckSize === size ? 'bg-zinc-800 text-white ring-1 ring-white/10' : 'text-zinc-600'}`}
                            >{size}</button>
                        ))}
                    </div>
                </div>

                <div className="space-y-3">
                    <h2 className="text-[10px] tracking-widest text-zinc-500 uppercase font-bold">Directives</h2>
                    <div className="flex bg-zinc-900/50 p-1 rounded-xl border border-white/5 h-[42px]">
                        <button onClick={() => setIsPerevodnoy(false)}
                            className={`flex-1 text-[8px] font-black uppercase tracking-tighter rounded-lg transition-all ${!isPerevodnoy ? 'bg-zinc-800 text-white ring-1 ring-white/10' : 'text-zinc-600'}`}
                        >Standard</button>
                        <button onClick={() => setIsPerevodnoy(true)}
                            className={`flex-1 text-[8px] font-black uppercase tracking-tighter rounded-lg transition-all ${isPerevodnoy ? 'bg-zinc-800 text-white ring-1 ring-white/10' : 'text-zinc-600'}`}
                        >Transfer</button>
                    </div>
                </div>
            </div>

            {/* QA Auto-Tester */}
            <div className="bg-zinc-950/40 p-4 rounded-2xl border border-white/5 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${autoPlay ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-zinc-800'}`}></div>
                    <div>
                        <h2 className="text-[10px] font-black text-zinc-300 tracking-widest uppercase">Consultant Mode</h2>
                        <p className="text-[8px] text-zinc-600 uppercase tracking-tighter">AI makes executive decisions</p>
                    </div>
                </div>
                <button
                    onClick={() => setAutoPlay(!autoPlay)}
                    className={`w-10 h-5 rounded-full relative transition-colors duration-300 ${autoPlay ? 'bg-amber-600' : 'bg-zinc-800'}`}
                >
                    <div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-transform duration-300 ${autoPlay ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
            </div>

            {/* INITIALIZE BUTTON */}
            <button
                onClick={handleCreateRoom}
                className="mt-4 relative group rounded-2xl transition-all active:scale-95 py-5 overflow-hidden shadow-2xl"
            >
                <div className="absolute inset-0 bg-gradient-to-r from-amber-600 to-yellow-500 opacity-90 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative flex items-center justify-center gap-3">
                    <span className="text-black font-black tracking-[0.2em] text-xs uppercase">
                        {mode === 'single' ? 'Initialize Match' : 'Deploy Lobby'}
                    </span>
                    <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </div>
            </button>

        </div>
    );
}