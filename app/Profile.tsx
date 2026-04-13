"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Profile() {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    return (
        <div className="flex flex-col gap-6 h-full relative">

            <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 p-6 rounded-2xl border border-white/10 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                <div className="flex items-center gap-5 relative z-10">
                    <div className="w-20 h-20 rounded-full bg-zinc-800 border-2 border-amber-500/50 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                        <span className="text-3xl">♠️</span>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-zinc-100 tracking-wide">Guest_7742</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="bg-amber-500/20 text-amber-500 border border-amber-500/30 text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-sm font-bold">VIP Member</span>
                            <span className="text-xs text-zinc-500">Level 12</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-900/50 p-4 rounded-xl border border-white/5 flex flex-col items-center justify-center shadow-inner">
                    <span className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1">Win Rate</span>
                    <span className="text-2xl font-light text-emerald-400">68<span className="text-sm">%</span></span>
                </div>
                <div className="bg-zinc-900/50 p-4 rounded-xl border border-white/5 flex flex-col items-center justify-center shadow-inner">
                    <span className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1">Total Earnings</span>
                    <span className="text-2xl font-light text-amber-500"><span className="text-sm">$</span>1.2M</span>
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
                        {/* Background Dimmer */}
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute -inset-6 bg-black/60 backdrop-blur-sm z-40"
                            onClick={() => setIsSettingsOpen(false)}
                        />
                        {/* The Drawer */}
                        <motion.div
                            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                            className="absolute -bottom-6 -left-6 -right-6 bg-zinc-900 border-t border-white/10 rounded-t-3xl z-50 p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]"
                        >
                            <div className="w-12 h-1 bg-zinc-700 rounded-full mx-auto mb-6"></div>
                            <h3 className="text-zinc-200 font-bold uppercase tracking-widest mb-4 text-sm">Account Settings</h3>
                            <div className="space-y-2">
                                <button className="w-full text-left p-4 rounded-xl hover:bg-zinc-800 transition-colors text-sm text-zinc-400 font-medium">Sound & Haptics</button>
                                <button className="w-full text-left p-4 rounded-xl hover:bg-zinc-800 transition-colors text-sm text-zinc-400 font-medium">Privacy & Data</button>
                                <button className="w-full text-left p-4 rounded-xl bg-red-950/20 text-red-500 hover:bg-red-900/30 transition-colors text-sm font-bold mt-4 border border-red-900/30">Sign Out</button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}