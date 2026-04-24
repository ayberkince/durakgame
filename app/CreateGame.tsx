"use client";
import React, { useState } from 'react';
import { socket } from './socket';
import { motion, AnimatePresence } from 'framer-motion';

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
        if (isDeploying) return;
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

        // 🛡️ ENHANCED SAFETY TIMEOUT
        const linkTimeout = setTimeout(() => {
            setIsDeploying(false);
            // This alert triggers if the server-side Game Engine crashes silently
            alert("📡 ENCRYPTION TIMEOUT: The table could not be initialized. Check Server Logs.");
        }, 10000);

        socket.emit('create_room', settings, (response: any) => {
            clearTimeout(linkTimeout);
            setIsDeploying(false);

            if (response && response.success) {
                if (mode === 'single') {
                    // Deployment: Table Direct
                    onStart({ ...settings, roomId: response.roomId });
                } else {
                    // Deployment: Operational Lobby
                    onStart('go_to_lobby');
                }
            } else {
                alert("🔴 PROTOCOL REJECTED: " + (response?.error || "Unknown Error"));
            }
        });
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-7 pb-8 custom-scrollbar"
        >
            {/* 💰 CONTRACT STAKES */}
            <div className="space-y-3">
                <header className="flex justify-between items-center px-1">
                    <h2 className="text-[10px] tracking-[0.4em] text-amber-500 uppercase font-black">Contract Stakes</h2>
                    <div className="flex gap-1">
                        <div className="w-1 h-1 rounded-full bg-amber-500/40 animate-pulse"></div>
                        <div className="w-1 h-1 rounded-full bg-amber-500/20 animate-pulse delay-75"></div>
                    </div>
                </header>
                <div className="grid grid-cols-3 bg-zinc-950 p-1.5 rounded-2xl border border-white/5 shadow-inner">
                    {[100, 1000, 10000].map(val => (
                        <button
                            key={val}
                            onClick={() => setStakes(val)}
                            className={`py-3.5 text-[10px] font-black uppercase tracking-tighter rounded-xl transition-all duration-300 ${stakes === val ? 'bg-amber-600 text-black shadow-[0_0_25px_rgba(245,158,11,0.25)] scale-[1.02] z-10' : 'text-zinc-600 hover:text-zinc-400 hover:bg-white/5'}`}
                        >
                            ${val >= 1000 ? `${val / 1000}K` : val}
                        </button>
                    ))}
                </div>
            </div>

            {/* 🛰️ ENGAGEMENT PROTOCOL */}
            <div className="space-y-3">
                <h2 className="text-[10px] tracking-[0.4em] text-zinc-600 uppercase font-black ml-1">Engagement Protocol</h2>
                <div className="flex bg-zinc-950 p-1.5 rounded-2xl border border-white/5">
                    <ProtocolBtn active={mode === 'single'} onClick={() => setMode('single')} label="Artificial" icon="🤖" />
                    <ProtocolBtn active={mode === 'multi'} onClick={() => setMode('multi')} label="Network" icon="🌐" />
                </div>
            </div>

            {/* 👥 TABLE CAPACITY */}
            <div className="space-y-3">
                <h2 className="text-[10px] tracking-[0.4em] text-zinc-600 uppercase font-black ml-1">Table Capacity</h2>
                <div className="flex bg-zinc-950 p-1.5 rounded-2xl border border-white/5">
                    {[2, 3, 4, 5, 6].map(num => (
                        <button key={num} onClick={() => setPlayers(num)}
                            className={`flex-1 py-3.5 text-xs font-black rounded-xl transition-all ${players === num ? 'bg-zinc-800 text-amber-500 shadow-lg ring-1 ring-white/10' : 'text-zinc-700 hover:text-zinc-500'}`}
                        >{num}</button>
                    ))}
                </div>
            </div>

            {/* ⚙️ INTELLIGENCE ENGINE (Responsive Visibility) */}
            <AnimatePresence mode="wait">
                {mode === 'single' && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-3 overflow-hidden"
                    >
                        <h2 className="text-[10px] tracking-[0.4em] text-zinc-600 uppercase font-black ml-1">Intelligence Level</h2>
                        <div className="flex bg-zinc-950 p-1.5 rounded-2xl border border-white/5">
                            {['easy', 'medium', 'hard'].map(level => (
                                <button key={level} onClick={() => setDifficulty(level)}
                                    className={`flex-1 py-3 text-[9px] tracking-[0.3em] uppercase font-black rounded-xl transition-all ${difficulty === level ? 'bg-zinc-800 text-white shadow-md ring-1 ring-white/10' : 'text-zinc-700'}`}
                                >{level}</button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 🃏 ASSETS & RULES */}
            <div className="grid grid-cols-2 gap-5">
                <div className="space-y-3">
                    <h2 className="text-[9px] tracking-[0.3em] text-zinc-600 uppercase font-black ml-1">Asset Count</h2>
                    <div className="flex bg-zinc-950 p-1.5 rounded-2xl border border-white/5">
                        {[24, 36, 52].map(size => (
                            <button key={size} onClick={() => setDeckSize(size as any)}
                                className={`flex-1 py-3 text-[10px] font-black rounded-lg transition-all ${deckSize === size ? 'bg-zinc-800 text-white ring-1 ring-white/10' : 'text-zinc-700'}`}
                            >{size}</button>
                        ))}
                    </div>
                </div>

                <div className="space-y-3">
                    <h2 className="text-[9px] tracking-[0.3em] text-zinc-600 uppercase font-black ml-1">Ruleset</h2>
                    <div className="flex bg-zinc-950 p-1.5 rounded-2xl border border-white/5 h-[50px]">
                        <button onClick={() => setIsPerevodnoy(false)}
                            className={`flex-1 text-[8px] font-black uppercase tracking-widest rounded-lg transition-all ${!isPerevodnoy ? 'bg-zinc-800 text-white ring-1 ring-white/10' : 'text-zinc-700'}`}
                        >Standard</button>
                        <button onClick={() => setIsPerevodnoy(true)}
                            className={`flex-1 text-[8px] font-black uppercase tracking-widest rounded-lg transition-all ${isPerevodnoy ? 'bg-zinc-800 text-white ring-1 ring-white/10' : 'text-zinc-700'}`}
                        >Transfer</button>
                    </div>
                </div>
            </div>

            {/* 🧠 CONSULTANT OVERLAY */}
            <div className="bg-zinc-950/40 p-5 rounded-[2.5rem] border border-white/5 flex justify-between items-center group hover:border-amber-500/20 transition-all">
                <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full transition-all duration-700 ${autoPlay ? 'bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]' : 'bg-zinc-900'}`}></div>
                    <div>
                        <h2 className="text-[10px] font-black text-zinc-400 tracking-[0.2em] uppercase">Consultant Mode</h2>
                        <p className="text-[8px] text-zinc-700 uppercase tracking-tighter font-bold">Predictive AI Analysis</p>
                    </div>
                </div>
                <button
                    onClick={() => setAutoPlay(!autoPlay)}
                    className={`w-12 h-6 rounded-full relative transition-all duration-500 ${autoPlay ? 'bg-amber-600' : 'bg-zinc-900 border border-white/5'}`}
                >
                    <motion.div
                        animate={{ x: autoPlay ? 26 : 4 }}
                        className="w-4 h-4 bg-white rounded-full absolute top-1 shadow-2xl"
                    />
                </button>
            </div>

            {/* ⚡ DEPLOYMENT ACTUATOR */}
            <button
                onClick={handleInitialize}
                disabled={isDeploying}
                className="mt-2 relative group rounded-[2rem] transition-all active:scale-[0.97] py-6 overflow-hidden shadow-2xl"
            >
                <div className={`absolute inset-0 bg-gradient-to-r from-amber-600 to-yellow-500 transition-opacity duration-700 ${isDeploying ? 'opacity-30 animate-pulse' : 'opacity-95 group-hover:opacity-100'}`}></div>
                <div className="relative flex items-center justify-center gap-4">
                    <span className="text-black font-black tracking-[0.5em] text-[11px] uppercase">
                        {isDeploying ? 'Establishing Link...' : (mode === 'single' ? 'Initialize Match' : 'Deploy Lobby')}
                    </span>
                    {!isDeploying && <span className="text-black text-lg group-hover:translate-x-1 transition-transform">→</span>}
                </div>
            </button>

        </motion.div>
    );
}

// Sub-component for clean mapping
function ProtocolBtn({ active, onClick, label, icon }: any) {
    return (
        <button onClick={onClick}
            className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.3em] rounded-xl transition-all flex items-center justify-center gap-3 ${active ? 'bg-zinc-800 text-white shadow-2xl ring-1 ring-white/10' : 'text-zinc-700 hover:text-zinc-500'}`}
        >
            <span className={`text-base transition-opacity ${active ? 'opacity-100' : 'opacity-20'}`}>{icon}</span>
            {label}
        </button>
    );
}