"use client";
import React, { useState, useEffect } from 'react';
import { saveProfile } from './identity';
import { motion, AnimatePresence } from 'framer-motion';
import Avatar from './Avatar'; // Ensure this path is correct

export default function DossierLogin({ onLogin }: { onLogin: () => void }) {
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(false);
    const [statusIndex, setStatusIndex] = useState(0);

    const statusMessages = [
        "ESTABLISHING ENCRYPTED UPLINK...",
        "AUTHENTICATING BIOMETRICS...",
        "SYNCING WITH ATLAS CLOUD...",
        "DECRYPTING EXECUTIVE LEDGER...",
        "ACCESS GRANTED."
    ];

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (loading && statusIndex < statusMessages.length - 1) {
            interval = setInterval(() => {
                setStatusIndex(prev => prev + 1);
            }, 650);
        }
        return () => clearInterval(interval);
    }, [loading, statusIndex]);

    const handleAccess = (e: React.FormEvent) => {
        e.preventDefault();
        if (username.trim().length < 3) return;
        setLoading(true);

        setTimeout(() => {
            saveProfile(username.trim());
            onLogin();
        }, 3500);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 p-6 text-white relative overflow-hidden">

            {/* Background Data Stream Ambience */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-amber-500/5 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-zinc-800/10 rounded-full blur-[120px]"></div>
                {/* Subtle Grid Overlay */}
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03]"></div>
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8 }}
                className="w-full max-w-sm space-y-8 relative z-10"
            >
                {/* IDENTITY HEADER */}
                <div className="text-center space-y-6">
                    <div className="relative inline-block group">
                        {/* The Retinal Scanner Ring */}
                        <motion.div
                            animate={loading ? { rotate: 360 } : { rotate: 0 }}
                            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                            className={`absolute -inset-4 border border-dashed rounded-full transition-opacity duration-500 ${loading ? 'border-amber-500/50 opacity-100' : 'border-white/5 opacity-0'}`}
                        />

                        {/* Your Shadow Avatar */}
                        <div className="relative z-10 p-1 bg-zinc-900 rounded-full border border-white/5 shadow-2xl">
                            <Avatar
                                name={username || "AGENT"}
                                size="lg"
                                className={`transition-all duration-500 ${loading ? 'brightness-125' : ''}`}
                            />
                        </div>

                        {/* Glow Pulse */}
                        <div className="absolute inset-0 bg-amber-500/10 rounded-full blur-3xl animate-pulse -z-10"></div>
                    </div>

                    <div className="space-y-1">
                        <h1 className="text-2xl font-black uppercase tracking-[0.5em] text-amber-500 ml-2">
                            Dossier
                        </h1>
                        <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-[0.3em]">
                            Personnel Identification Required
                        </p>
                    </div>
                </div>

                {/* LOGIN FORM */}
                <form onSubmit={handleAccess} className="space-y-6">
                    <div className="space-y-3">
                        <div className="flex justify-between items-end px-1">
                            <label className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">
                                Assigned Codename
                            </label>
                            <span className="text-[8px] font-mono text-zinc-700">LVL_4_AUTH</span>
                        </div>

                        <div className="relative">
                            <input
                                type="text"
                                placeholder="ENTER ALIAS"
                                value={username}
                                onChange={(e) => setUsername(e.target.value.toUpperCase())}
                                disabled={loading}
                                maxLength={12}
                                className="w-full bg-zinc-900/40 border border-white/5 p-5 rounded-2xl text-center text-xs font-black uppercase tracking-[0.4em] text-white focus:outline-none focus:border-amber-500/40 transition-all placeholder:text-zinc-800 shadow-inner"
                            />
                            {/* Scanning Line Effect */}
                            {!loading && username.length > 0 && (
                                <motion.div
                                    initial={{ top: '0%' }}
                                    animate={{ top: '100%' }}
                                    transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                                    className="absolute left-0 right-0 h-px bg-amber-500/20 pointer-events-none"
                                />
                            )}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || username.length < 3}
                        className="relative w-full group rounded-2xl active:scale-[0.97] transition-all disabled:opacity-0"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-amber-600 to-amber-400 rounded-2xl"></div>
                        <div className="relative py-5 flex items-center justify-center gap-3">
                            <span className="text-black font-black uppercase tracking-[0.2em] text-[10px]">
                                Initialize Protocol
                            </span>
                            <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                        </div>
                    </button>
                </form>

                {/* FOOTER */}
                <div className="text-center space-y-4">
                    <div className="flex items-center justify-center gap-4">
                        <div className="h-px w-8 bg-zinc-900"></div>
                        <p className="text-[8px] text-zinc-700 font-bold uppercase tracking-widest">
                            Secure Session 2026
                        </p>
                        <div className="h-px w-8 bg-zinc-900"></div>
                    </div>
                </div>
            </motion.div>

            {/* FULL SCREEN LOADING TERMINAL */}
            <AnimatePresence>
                {loading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-zinc-950 z-50 flex flex-col items-center justify-center p-12"
                    >
                        {/* Circular Progress */}
                        <div className="relative mb-12">
                            <div className="w-24 h-24 border-4 border-zinc-900 rounded-full"></div>
                            <motion.div
                                initial={{ rotate: 0 }}
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                                className="absolute inset-0 border-4 border-transparent border-t-amber-500 rounded-full"
                            />
                        </div>

                        <div className="w-full max-w-xs space-y-6">
                            <div className="space-y-2">
                                <motion.p
                                    key={statusIndex}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="text-[10px] font-mono text-amber-500 font-bold tracking-widest text-center"
                                >
                                    {statusMessages[statusIndex]}
                                </motion.p>

                                {/* Progress Bar */}
                                <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: '100%' }}
                                        transition={{ duration: 3.2, ease: "easeInOut" }}
                                        className="h-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                                    />
                                </div>
                            </div>

                            {/* Hacker Visual Noise */}
                            <div className="grid grid-cols-4 gap-2 opacity-20">
                                {[...Array(8)].map((_, i) => (
                                    <div key={i} className="h-1 bg-zinc-700 rounded-full animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}