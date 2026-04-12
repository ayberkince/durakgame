"use client";
import React from 'react';

export default function PrivateGamesList() {
    // Dummy data based on your screenshot
    const games = [
        { id: 1, name: "***", deck: 24, bet: "1K", players: "1/2" },
        { id: 2, name: "нет", deck: 36, bet: "250", players: "1/3" },
        { id: 3, name: "Павел Сухарев", deck: 52, bet: "1K", players: "1/5" },
        { id: 4, name: "Торфін", deck: 24, bet: "500", players: "1/2" },
    ];

    return (
        <div className="flex flex-col gap-3">
            {games.map(g => (
                <div key={g.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex justify-between items-center text-sm hover:border-slate-500 cursor-pointer transition-colors">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-slate-400">🔒</span>
                            <span className="font-bold text-white">{g.name}</span>
                        </div>
                        <div className="flex items-center gap-3 text-slate-400">
                            <span className="text-green-400 font-bold">💵 {g.bet}</span>
                            <span>👥 {g.players}</span>
                        </div>
                    </div>
                    <div className="bg-slate-700 px-3 py-1 rounded text-blue-300 font-bold flex items-center gap-2">
                        {g.deck} <span className="text-slate-400">❯</span>
                    </div>
                </div>
            ))}
        </div>
    );
}