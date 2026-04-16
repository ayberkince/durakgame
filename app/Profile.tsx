"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { socket } from './socket';
import { getProfile, logout } from './identity';

export default function Profile() {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [stats, setStats] = useState({
        balance: 0,
        wins: 0,
        losses: 0,
        loading: true
    });

    const profile = getProfile();

    useEffect(() => {
        // 1. Sync with the Cloud Database on mount
        socket.emit('sync_profile', (response: any) => {
            if (response.success) {
                setStats({
                    balance: response.balance,
                    wins: response.wins,
                    losses: response.losses,
                    loading: false
                });
            }
        });
    }, []);

    const handleSignOut = () => {
        logout();
        window.location.reload(); // Hard refresh to reset the app state
    };

    // Calculate Win Rate safely
    const totalGames = stats.wins + stats.losses;
    const winRate = totalGames > 0 ? Math.round((stats.wins / totalGames) * 100) : 0;

    if (stats.loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
                <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Accessing Secure Records...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 h-full relative">

            {/* HEADER CARD */}
            <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 p-6 rounded-2xl border border-white/10 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                <div className="flex items-center gap-5 relative z-10">
                    <div className="w-20 h-20 rounded-full bg-zinc-800 border-2 border-amber-500/50 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                        <span className="text-3xl">♠️</span>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-zinc-100 tracking-wide">{profile?.username || 'Executive'}</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="bg-amber-500/20 text-amber-500 border border-amber-500/30 text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-sm font-bold">VIP Member</span>
                            <span className="text-xs text-zinc-500">Tier {Math.floor(stats.wins / 5) + 1}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* STATS GRID */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-900/50 p-4 rounded-xl border border-white/5 flex flex-col items-center justify-center shadow-inner">
                    <span className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1">Win Rate</span>
                    <span className={`text-2xl font-light ${winRate >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {winRate}<span className="text-sm">%</span>
                    </span>
                </div>
                <div className="bg-zinc-900/50 p-4 rounded-xl border border-white/5 flex flex-col items-center justify-center shadow-inner">
                    <span className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1">Net Worth</span>
                    <span className="text-2xl font-light text-amber-500">
                        <span className="text-sm">$</span>{(stats.balance / 1000).toFixed(1)}k
                    </span>
                </div>
            </div>

            {/* SECONDARY STATS */}
            <div className="bg-zinc-950/40 border border-white/5 rounded-2xl p-4 divide-y divide-white/5">
                <div className="flex justify-between py-3">
                    <span className="text-xs text-zinc-500 uppercase tracking-wider">Victories</span>
                    <span className="text-xs font-bold text-zinc-200">{stats.wins}</span>
                </div>
                <div className="flex justify-between py-3">
                    <span className="text-xs text-zinc-500 uppercase tracking-wider">Total Games</span>
                    <span className="text-xs font-bold text-zinc-200">{totalGames}</span>
                </div>
            </div>

            <button
                onClick={() => setIsSettingsOpen(true)}
                className="mt-auto py-4 rounded-xl border border-zinc-700 text-zinc-400 text-xs uppercase tracking-widest font-bold hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
            >
                Account Settings
            </button>

            {/* BOTTOM SHEET MODAL */}
            <AnimatePresence>
                {isSettingsOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute -inset-6 bg-black/80 backdrop-blur-md z-40"
                            onClick={() => setIsSettingsOpen(false)}
                        />
                        <motion.div
                            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                            className="absolute -bottom-6 -left-6 -right-6 bg-zinc-900 border-t border-white/10 rounded-t-3xl z-50 p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]"
                        >
                            <div className="w-12 h-1 bg-zinc-700 rounded-full mx-auto mb-6"></div>
                            <h3 className="text-zinc-200 font-bold uppercase tracking-widest mb-4 text-sm text-center">Settings</h3>
                            <div className="space-y-2">
                                <button className="w-full text-left p-4 rounded-xl hover:bg-zinc-800 transition-colors text-sm text-zinc-400 font-medium flex justify-between">
                                    <span>Haptic Feedback</span>
                                    <span className="text-amber-500 uppercase text-[10px]">On</span>
                                </button>
                                <button className="w-full text-left p-4 rounded-xl hover:bg-zinc-800 transition-colors text-sm text-zinc-400 font-medium">Clear Cache</button>
                                <button
                                    onClick={handleSignOut}
                                    className="w-full text-left p-4 rounded-xl bg-red-950/20 text-red-500 hover:bg-red-900/30 transition-colors text-sm font-bold mt-4 border border-red-900/30 flex justify-between items-center"
                                >
                                    <span>Sign Out / Delete Account</span>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}