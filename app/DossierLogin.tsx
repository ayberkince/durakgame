"use client";
import React, { useState, useEffect } from 'react';
import { saveProfile } from './identity';
import { motion, AnimatePresence } from 'framer-motion';

export default function DossierLogin({ onLogin }: { onLogin: () => void }) {
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(false);
    const [statusIndex, setStatusIndex] = useState(0);

    const statusMessages = [
        "INITIALIZING SECURE LINK...",
        "BYPASSING REGIONAL FIREWALLS...",
        "SYNCING GLOBAL LEDGER...",
        "DECRYPTING AGENT RECORDS...",
        "ACCESS GRANTED."
    ];

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (loading && statusIndex < statusMessages.length - 1) {
            interval = setInterval(() => {
                setStatusIndex(prev => prev + 1);
            }, 600);
        }
        return () => clearInterval(interval);
    }, [loading, statusIndex]);

    const handleAccess = (e: React.FormEvent) => {
        e.preventDefault();
        if (username.trim().length < 3) return;

        setLoading(true);

        // Simulate terminal processing
        setTimeout(() => {
            saveProfile(username.trim());
            onLogin();
        }, 3200);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 p-6 text-white relative overflow-hidden">

            {/* Background Ambience */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-amber-500/10 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-zinc-800/20 rounded-full blur-[120px]"></div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="w-full max-w-sm space-y-10 relative z-10"
            >
                {/* Logo Section */}
                <div className="text-center space-y-4">
                    <div className="relative inline-block">
                        <div className="p-5 bg-zinc-900 border border-amber-500/20 rounded-[2.5rem] shadow-2xl relative z-10">
                            <span className="text-5xl block transform group-hover:scale-110 transition-transform">♠️</span>
                        </div>
                        <div className="absolute inset-0 bg-amber-500/20 rounded-[2.5rem] blur-2xl animate-pulse"></div>
                    </div>

                    <div className="space-y-1">
                        <h1 className="text-3xl font-black uppercase tracking-[0.4em] text-amber-500">
                            Dossier
                        </h1>
                        <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-[0.3em]">
                            Executive Economic Protocol
                        </p>
                    </div>
                </div>

                {/* Input Section */}
                <form onSubmit={handleAccess} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">
                            Identification Codename
                        </label>
                        <div className="relative group">
                            <input
                                type="text"
                                placeholder="ENTER ALIAS"
                                value={username}
                                onChange={(e) => setUsername(e.target.value.toUpperCase())}
                                disabled={loading}
                                maxLength={12}
                                className="w-full bg-zinc-900/50 border border-white/5 p-5 rounded-2xl text-center text-xs font-black uppercase tracking-[0.4em] text-white focus:outline-none focus:border-amber-500/40 transition-all placeholder:text-zinc-800 shadow-inner disabled:opacity-50"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || username.length < 3}
                        className="relative w-full overflow-hidden group rounded-2xl active:scale-[0.98] transition-all disabled:opacity-0"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-amber-600 to-yellow-500"></div>
                        <div className="relative py-5 flex items-center justify-center gap-3">
                            <span className="text-black font-black uppercase tracking-[0.2em] text-[10px]">
                                Initialize Session
                            </span>
                            <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                        </div>
                    </button>
                </form>

                {/* Loading Overlay */}
                <AnimatePresence>
                    {loading && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-zinc-950 z-50 flex flex-col items-center justify-center space-y-6"
                        >
                            <div className="w-12 h-12 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
                            <div className="space-y-2 text-center">
                                <motion.p
                                    key={statusIndex}
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-[10px] font-mono text-amber-500 font-bold tracking-widest"
                                >
                                    {statusMessages[statusIndex]}
                                </motion.p>
                                <div className="w-48 h-1 bg-zinc-900 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: '100%' }}
                                        transition={{ duration: 3 }}
                                        className="h-full bg-amber-500"
                                    ></motion.div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Footer Disclaimer */}
                <div className="text-center space-y-4 pt-4">
                    <p className="text-[8px] text-zinc-700 font-bold uppercase tracking-tighter leading-relaxed px-8">
                        Match stakes are deducted from global balance immediately upon loss.
                        Protocol termination results in forfeit of current pot.
                    </p>
                    <div className="flex justify-center gap-4 opacity-20">
                        <div className="w-1 h-1 bg-white rounded-full"></div>
                        <div className="w-1 h-1 bg-white rounded-full"></div>
                        <div className="w-1 h-1 bg-white rounded-full"></div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}