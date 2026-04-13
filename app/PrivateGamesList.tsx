"use client";
import React from 'react';

// Setting this to empty to trigger the premium Empty State!
const dummyGames: any[] = [];

export default function PrivateGamesList() {
    return (
        <div className="flex flex-col gap-4">

            <div className="flex gap-2">
                <div className="flex-1 bg-zinc-900/50 border border-white/5 rounded-xl px-4 py-3 flex items-center gap-3 shadow-inner">
                    <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    <input
                        type="text"
                        placeholder="Search tables..."
                        className="bg-transparent border-none outline-none text-sm text-zinc-200 placeholder-zinc-600 w-full"
                    />
                </div>
                <button className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 p-3 rounded-xl border border-white/5 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                </button>
            </div>

            <div className="flex items-center justify-between mt-2 px-1">
                <h2 className="text-[10px] tracking-widest text-zinc-500 uppercase font-semibold">Active Tables</h2>
                <span className="text-[10px] text-amber-500 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">{dummyGames.length} Online</span>
            </div>

            {/* PREMIUM EMPTY STATE */}
            {dummyGames.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center mt-16 px-6">
                    <div className="w-20 h-20 bg-zinc-900 border border-white/5 rounded-full flex items-center justify-center mb-5 shadow-inner relative">
                        <div className="absolute inset-0 bg-amber-500/10 rounded-full blur-xl animate-pulse"></div>
                        <span className="text-3xl opacity-50 relative z-10 text-zinc-400">🂠</span>
                    </div>
                    <h3 className="text-zinc-200 font-bold tracking-wide mb-2 text-lg">The tables are quiet.</h3>
                    <p className="text-xs text-zinc-500 mb-8 leading-relaxed">There are currently no high-stakes lobbies open. Be the first executive to host a match.</p>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {dummyGames.map((game) => (
                        // ... (Your old game mapping code would go here)
                        <div key={game.id}></div>
                    ))}
                </div>
            )}
        </div>
    );
}