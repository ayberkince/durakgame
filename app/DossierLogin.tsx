"use client";
import React, { useState, useEffect } from 'react';
import { socket } from './socket';
import Avatar from './components/Avatar';

export default function DossierLogin({ onAuthorized }: { onAuthorized: (profile: any) => void }) {
    const [codename, setCodename] = useState('');
    const [status, setStatus] = useState('STANDBY');
    const [isProcessing, setIsProcessing] = useState(false);

    const handleAccess = (e: React.FormEvent) => {
        e.preventDefault();
        if (codename.length < 3) return;

        setIsProcessing(true);
        setStatus('ESTABLISHING SECURE LINK...');

        // Connect socket and sync with MongoDB
        socket.auth = { profile: { username: codename, id: Math.random().toString(36).substr(2, 9) } };
        socket.connect();

        socket.emit('sync_profile', (response: any) => {
            if (response.success) {
                setStatus('IDENTITY VERIFIED. ACCESS GRANTED.');
                setTimeout(() => onAuthorized(response), 1000);
            } else {
                setStatus('CONNECTION REFUSED. DATABASE OFFLINE.');
                setIsProcessing(false);
                socket.disconnect();
            }
        });
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 p-6 text-white selection:bg-amber-500/30">
            <div className="w-full max-w-sm space-y-8 animate-in fade-in zoom-in duration-1000">

                {/* Visual Identity */}
                <div className="text-center space-y-4">
                    <div className="relative inline-block">
                        <Avatar name={codename || "AGENT"} size="lg" className={isProcessing ? 'animate-pulse border-amber-500' : ''} />
                        <div className="absolute inset-0 bg-amber-500/10 rounded-full blur-3xl -z-10"></div>
                    </div>
                    <div>
                        <h1 className="text-2xl font-black uppercase tracking-[0.4em] text-amber-500">Durak Elite</h1>
                        <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mt-1">Global Security Protocol</p>
                    </div>
                </div>

                {/* Secure Input */}
                <form onSubmit={handleAccess} className="space-y-4">
                    <div className="relative group">
                        <input
                            type="text"
                            value={codename}
                            onChange={(e) => setCodename(e.target.value.toUpperCase())}
                            placeholder="ENTER CODENAME"
                            maxLength={12}
                            disabled={isProcessing}
                            className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl px-4 py-5 text-center text-xs font-black uppercase tracking-[0.3em] text-white focus:outline-none focus:border-amber-500/40 transition-all placeholder:text-zinc-800"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isProcessing || codename.length < 3}
                        className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-20 text-black font-black uppercase tracking-[0.2em] text-[10px] py-5 rounded-2xl transition-all active:scale-95 shadow-lg shadow-amber-600/10"
                    >
                        {isProcessing ? "INITIALIZING..." : "Request Authorization"}
                    </button>
                </form>

                {/* Status Terminal */}
                <div className="bg-black/50 border border-white/5 rounded-xl p-3 h-12 flex items-center justify-center">
                    <p className={`text-[9px] font-mono tracking-widest ${status.includes('REFUSED') ? 'text-red-500' : 'text-amber-500/60'}`}>
                        {status}
                    </p>
                </div>

                <footer className="text-center pt-4 opacity-20">
                    <p className="text-[7px] text-zinc-400 uppercase tracking-tighter">
                        Encrypted Connection • Secure Ledger v4.0.2
                    </p>
                </footer>
            </div>
        </div>
    );
}