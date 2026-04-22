"use client";
import React, { useState } from 'react';
import { socket } from './socket';
import { motion } from 'framer-motion';

interface CreateGameProps {
    onStart: (settings: any) => void;
}

export default function CreateGame({ onStart }: CreateGameProps) {
    const [mode, setMode] = useState<'single' | 'multi'>('single');
    const [players, setPlayers] = useState(2);
    const [deckSize, setDeckSize] = useState<24 | 36 | 52>(36);
    const [isPerevodnoy, setIsPerevodnoy] = useState(false);
    const [difficulty, setDifficulty] = useState('medium');
    const [autoPlay, setAutoPlay] = useState(false);
    const [stakes, setStakes] = useState(1000);
    const [isDeploying, setIsDeploying] = useState(false);

    const handleInitialize = () => {
        setIsDeploying(true);

        const settings = {
            mode,
            players,
            deckSize,
            isPerevodnoy,
            difficulty,
            autoPlay,
            stakes
        };

        // Emit to server and wait for match ID allocation
        socket.emit('create_room', settings, (response: any) => {
            setIsDeploying(false);
            if (response.success) {
                if (mode === 'single') {
                    // Direct deployment to table
                    onStart({ ...settings, roomId: response.roomId });
                } else {
                    // Navigate to global lobby
                    onStart('go_to_lobby');
                }
            } else {
                alert("🔴 PROTOCOL FAILURE: " + (response.error || "Server unreachable"));
            }
        });
    };

    return (
        <div className="flex flex-col gap-7 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-4">

            {/* 💰 CONTRACT STAKES */}
            <div className="space-y-3">
                <header className="flex justify-between items-center px-1">
                    <h2 className="text-[10px] tracking-[0.3em] text-amber-500 uppercase font-black">Contract Stakes</h2>
                    <span className="text-[9px] font-mono text-zinc-700">ESCROW_SYNCED</span>
                </header>
                <div className="grid grid-cols-3 bg-zinc-950 p-1.5 rounded-2xl border border-white/5 shadow-inner">
                    {[100, 1000, 10000].map(val => (
                        <button key={val} onClick={() => setStakes(val)}
                            className={`py-3.5 text-[10px] font-black uppercase tracking-tighter rounded-xl transition-all duration-300 ${stakes === val ? 'bg-amber-600 text-black shadow-[0_0_20px_rgba(245,158,11,0.2)]' : 'text-zinc-600 hover:text-zinc-400'}`}
                        >
                            ${val >= 1000 ? `${val / 1000}K` : val}
                        </button>
                    ))}
                </div>
            </div>

            {/* 🛰️ ENGAGEMENT PROTOCOL */}
            <div className="space-y-3">
                <h2 className="text-[10px] tracking-[0.3em] text-zinc-600 uppercase font-black ml-1">Engagement Protocol</h2>
                <div className="flex bg-zinc-950 p-1.5 rounded-2xl border border-white/5">
                    <button onClick={() => setMode('single')}
                        className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all flex items-center justify-center gap-2 ${mode === 'single' ? 'bg-zinc-800 text-white shadow-xl ring-1 ring-white/10' : 'text-zinc-700'}`}
                    >
                        <span className={mode === 'single' ? 'opacity-100' : 'opacity-40'}>🤖</span> Artificial
                    </button>
                    <button onClick={() => setMode('multi')}
                        className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all flex items-center justify-center gap-2 ${mode === 'multi' ? 'bg-zinc-800 text-white shadow-xl ring-1 ring-white/10' : 'text-zinc-700'}`}
                    >
                        <span className={mode === 'multi' ? 'opacity-100' : 'opacity-40'}>🌐</span> Network
                    </button>
                </div>
            </div>

            {/* 👥 TABLE CAPACITY */}
            <div className="space-y-3">
                <h2 className="text-[10px] tracking-[0.3em] text-zinc-600 uppercase font-black ml-1">Table Capacity</h2>
                <div className="flex bg-zinc-950 p-1.5 rounded-2xl border border-white/5">
                    {[2, 3, 4, 5, 6].map(num => (
                        <button key={num} onClick={() => setPlayers(num)}
                            className={`flex-1 py-3 text-xs font-black rounded-xl transition-all ${players === num ? 'bg-zinc-800 text-amber-500 shadow-md ring-1 ring-white/10' : 'text-zinc-700 hover:text-zinc-500'}`}
                        >{num}</button>
                    ))}
                </div>
            </div>

            {/* ⚙️ BOT ALGORITHMS (SINGLE ONLY) */}
            <div className={`space-y-3 transition-all duration-500 ${mode === 'single' ? 'opacity-100' : 'opacity-20 pointer-events-none grayscale'}`}>
                <h2 className="text-[10px] tracking-[0.3em] text-zinc-600 uppercase font-black ml-1">Intelligence Level</h2>
                <div className="flex bg-zinc-950 p-1.5 rounded-2xl border border-white/5">
                    {['easy', 'medium', 'hard'].map(level => (
                        <button key={level} onClick={() => setDifficulty(level)}
                            className={`flex-1 py-3 text-[9px] tracking-[0.2em] uppercase font-black rounded-xl transition-all ${difficulty === level ? 'bg-zinc-800 text-white shadow-md ring-1 ring-white/10' : 'text-zinc-700'}`}
                        >{level}</button>
                    ))}
                </div>
            </div>

            {/* 🃏 ASSETS & DIRECTIVES GRID */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                    <h2 className="text-[9px] tracking-[0.3em] text-zinc-600 uppercase font-black ml-1">Asset Count</h2>
                    <div className="flex bg-zinc-950 p-1.5 rounded-2xl border border-white/5">
                        {[24, 36, 52].map(size => (
                            <button key={size} onClick={() => setDeckSize(size as any)}
                                className={`flex-1 py-2.5 text-[10px] font-black rounded-lg transition-all ${deckSize === size ? 'bg-zinc-800 text-white ring-1 ring-white/10' : 'text-zinc-700'}`}
                            >{size}</button>
                        ))}
                    </div>
                </div>

                <div className="space-y-3">
                    <h2 className="text-[9px] tracking-[0.3em] text-zinc-600 uppercase font-black ml-1">Directive</h2>
                    <div className="flex bg-zinc-950 p-1.5 rounded-2xl border border-white/5 h-[46px]">
                        <button onClick={() => setIsPerevodnoy(false)}
                            className={`flex-1 text-[8px] font-black uppercase tracking-tighter rounded-lg transition-all ${!isPerevodnoy ? 'bg-zinc-800 text-white ring-1 ring-white/10' : 'text-zinc-700'}`}
                        >Standard</button>
                        <button onClick={() => setIsPerevodnoy(true)}
                            className={`flex-1 text-[8px] font-black uppercase tracking-tighter rounded-lg transition-all ${isPerevodnoy ? 'bg-zinc-800 text-white ring-1 ring-white/10' : 'text-zinc-700'}`}
                        >Transfer</button>
                    </div>
                </div>
            </div>

            {/* 🧠 CONSULTANT MODE (QA HOOK) */}
            <div className="bg-zinc-950/60 p-5 rounded-[2rem] border border-white/5 flex justify-between items-center group transition-colors hover:border-amber-500/20">
                <div className="flex items-center gap-4">
                    <div className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${autoPlay ? 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.6)]' : 'bg-zinc-800'}`}></div>
                    <div>
                        <h2 className="text-[10px] font-black text-zinc-400 tracking-[0.2em] uppercase">Consultant Mode</h2>
                        <p className="text-[8px] text-zinc-700 uppercase tracking-tighter font-bold">AI Guided Decision Making</p>
                    </div>
                </div>
                <button
                    onClick={() => setAutoPlay(!autoPlay)}
                    className={`w-12 h-6 rounded-full relative transition-all duration-300 ${autoPlay ? 'bg-amber-600' : 'bg-zinc-800'}`}
                >
                    <motion.div
                        animate={{ x: autoPlay ? 26 : 4 }}
                        className="w-4 h-4 bg-white rounded-full absolute top-1 shadow-md"
                    />
                </button>
            </div>

            {/* ⚡ DEPLOYMENT ACTUATOR */}
            <button
                onClick={handleInitialize}
                disabled={isDeploying}
                className="mt-2 relative group rounded-2xl transition-all active:scale-95 py-6 overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
            >
                <div className={`absolute inset-0 bg-gradient-to-r from-amber-600 to-yellow-500 transition-opacity duration-500 ${isDeploying ? 'opacity-40' : 'opacity-90 group-hover:opacity-100'}`}></div>
                <div className="relative flex items-center justify-center gap-4">
                    <span className="text-black font-black tracking-[0.4em] text-[11px] uppercase">
                        {isDeploying ? 'Establishing Link...' : (mode === 'single' ? 'Initialize Match' : 'Deploy Lobby')}
                    </span>
                    {!isDeploying && <svg className="w-4 h-4 text-black group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>}
                </div>
            </button>

        </div>
    );
}