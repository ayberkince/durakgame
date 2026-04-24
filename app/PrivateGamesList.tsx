"use client";
import React, { useEffect, useState, useMemo } from 'react';
import { socket } from './socket';
import { motion, AnimatePresence } from 'framer-motion';

interface GameRoom {
    id: string;
    host: string;
    players: number;
    maxPlayers: number;
    stakes: number;
    type?: string;
}

export default function PrivateGamesList({ onJoin }: { onJoin: (roomId: string) => void }) {
    const [liveGames, setLiveGames] = useState<GameRoom[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // 📡 Synchronize with Global Lobby
    useEffect(() => {
        const fetchRooms = () => {
            // If socket is disconnected, wait and try again
            if (!socket.connected) {
                console.log("⏳ Socket not ready, retrying intel gathering...");
                setTimeout(fetchRooms, 1000);
                return;
            }

            setIsLoading(true);
            socket.emit('get_rooms', (rooms: any) => {
                console.log("✅ Intel Received:", rooms);
                setLiveGames(rooms);
                setIsLoading(false);
            });
        };

        fetchRooms();

        socket.on('lobby_update', fetchRooms);

        return () => {
            socket.off('lobby_update');
        };
    }, []);

    // 🔍 Filter Rooms based on Search Query
    const filteredGames = useMemo(() => {
        return liveGames.filter(game =>
            game.host.toLowerCase().includes(searchQuery.toLowerCase()) ||
            game.id.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [liveGames, searchQuery]);

    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-700">

            {/* SEARCH & FILTER INTERFACE */}
            <div className="flex gap-2">
                <div className="flex-1 bg-zinc-950/50 border border-white/5 rounded-2xl px-4 py-3.5 flex items-center gap-3 shadow-inner group focus-within:border-amber-500/30 transition-all">
                    <svg className="w-4 h-4 text-zinc-600 group-focus-within:text-amber-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search Dossiers..."
                        className="bg-transparent text-[11px] font-black uppercase tracking-[0.2em] outline-none w-full text-zinc-300 placeholder:text-zinc-700"
                    />
                </div>
                <button className="bg-zinc-900 border border-white/5 p-3.5 rounded-2xl text-zinc-600 hover:text-amber-500 transition-all hover:bg-zinc-800">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                </button>
            </div>

            {/* LIST HEADER */}
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                    <h2 className="text-[10px] tracking-[0.4em] text-zinc-500 uppercase font-black">Live Contracts</h2>
                </div>
                <span className="text-[9px] text-amber-500 font-black bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 tabular-nums">
                    {filteredGames.length} ACTIVE
                </span>
            </div>

            {/* DYNAMIC CONTENT */}
            <div className="min-h-[300px]">
                <AnimatePresence mode="popLayout">
                    {isLoading ? (
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="flex flex-col items-center justify-center py-20 gap-4"
                        >
                            <div className="w-8 h-8 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
                            <span className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">Gathering Intel...</span>
                        </motion.div>
                    ) : filteredGames.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center justify-center text-center py-16 bg-zinc-950/30 rounded-[3rem] border border-dashed border-white/5 px-8"
                        >
                            <div className="text-4xl mb-4 opacity-20 grayscale">🗄️</div>
                            <h3 className="text-zinc-400 font-black tracking-widest text-xs uppercase">The Lobby is Silent</h3>
                            <p className="text-[9px] text-zinc-600 font-bold uppercase mt-2 leading-relaxed">
                                No active contracts found. Initialize a new match to begin operations.
                            </p>
                        </motion.div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {filteredGames.map((game, index) => (
                                <motion.button
                                    layout
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    key={game.id}
                                    onClick={() => onJoin(game.id)}
                                    className="group w-full bg-zinc-900/40 hover:bg-zinc-800/60 border border-white/5 hover:border-amber-500/40 p-5 rounded-[2rem] transition-all flex items-center justify-between relative overflow-hidden"
                                >
                                    {/* Subtle hover gradient */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-500/0 to-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                                    <div className="flex items-center gap-4 relative z-10">
                                        <div className="w-12 h-12 rounded-2xl bg-zinc-950 border border-white/5 flex items-center justify-center text-zinc-500 group-hover:text-amber-500 group-hover:border-amber-500/20 transition-all shadow-xl font-mono text-xs font-black">
                                            {game.id.substring(0, 2)}
                                        </div>
                                        <div className="text-left">
                                            <h3 className="font-black text-[11px] text-zinc-200 uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                                                {game.host}'s Match
                                            </h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[8px] font-mono text-zinc-600 uppercase">ID: {game.id}</span>
                                                <span className="w-1 h-1 rounded-full bg-zinc-800"></span>
                                                <span className="text-[8px] font-black text-amber-500/60 uppercase tracking-tighter">Verified</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-right relative z-10">
                                        <div className="flex items-center justify-end gap-1.5">
                                            <span className="text-[10px] text-zinc-600 font-bold">$</span>
                                            <span className="text-sm font-black text-zinc-100 tracking-tighter tabular-nums">
                                                {game.stakes >= 1000 ? `${game.stakes / 1000}K` : game.stakes}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-end gap-2 mt-1.5">
                                            <span className="text-[9px] font-black text-zinc-600 tracking-tighter tabular-nums">
                                                {game.players} / {game.maxPlayers}
                                            </span>
                                            <div className="w-10 h-1 bg-zinc-950 rounded-full overflow-hidden border border-white/5">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${(game.players / game.maxPlayers) * 100}%` }}
                                                    className="h-full bg-amber-500/50"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </motion.button>
                            ))}
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}