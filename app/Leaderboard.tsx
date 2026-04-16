"use client";
import React, { useEffect, useState } from 'react';
import { socket } from './socket';

export default function Leaderboard() {
    const [list, setList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        socket.emit('get_leaderboard', (response: any) => {
            if (response.success) {
                setList(response.leaderboard);
                setLoading(false);
            }
        });
    }, []);

    if (loading) return <div className="text-zinc-500 text-center p-10 animate-pulse">Fetching Dossiers...</div>;

    return (
        <div className="flex flex-col gap-4">
            <div className="px-2 mb-2 flex justify-between items-end">
                <h2 className="text-[10px] font-black tracking-[0.3em] text-zinc-500 uppercase">Global Ranking</h2>
                <span className="text-[10px] text-amber-500 font-bold uppercase tracking-widest">Top 10</span>
            </div>

            <div className="space-y-2">
                {list.map((player, index) => (
                    <div
                        key={index}
                        className={`group relative flex items-center justify-between p-4 rounded-xl border transition-all duration-300 ${index === 0
                                ? 'bg-amber-500/10 border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.1)]'
                                : 'bg-zinc-900/40 border-white/5 hover:border-white/10'
                            }`}
                    >
                        <div className="flex items-center gap-4">
                            <span className={`text-lg font-black w-6 ${index === 0 ? 'text-amber-500' :
                                    index === 1 ? 'text-zinc-300' :
                                        index === 2 ? 'text-orange-700' : 'text-zinc-700'
                                }`}>
                                {index + 1}
                            </span>
                            <div>
                                <div className="text-sm font-bold text-zinc-200 tracking-tight">
                                    {player.username}
                                    {index === 0 && <span className="ml-2 text-[10px] bg-amber-500 text-black px-1 rounded-sm">GOAT</span>}
                                </div>
                                <div className="text-[10px] text-zinc-500 uppercase tracking-widest">
                                    {player.stats.wins} Wins • {Math.round((player.stats.wins / (player.stats.wins + player.stats.losses || 1)) * 100)}% WR
                                </div>
                            </div>
                        </div>

                        <div className="text-right">
                            <div className="text-sm font-black text-amber-500 tracking-tighter">
                                ${(player.balance / 1000).toFixed(1)}k
                            </div>
                            <div className="text-[8px] text-zinc-600 uppercase tracking-tighter">Net Worth</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}