"use client";
import React, { useState, useEffect } from 'react';
import { useDurak } from './useDurak';
import PlayingCard from './PlayingCard';
import { motion, AnimatePresence } from 'framer-motion';
import { socket } from './socket';

const getSuitSymbol = (suite: number) => ['♣️', '♦️', '♥️', '♠️'][suite - 1] || '?';
const isRedSuit = (suite: number) => suite === 2 || suite === 3;
const EMOJIS = ['👋', '😂', '🤡', '💰', '🃏', '😡', '🤐', '🤝'];

export default function GameBoard({ settings, onLeave }: { settings: any, onLeave: () => void }) {
    const {
        gameState,
        playCard,
        passOrTake,
        HUMAN_ID,
        sendEmoji,
        activeEmojis = {}
    } = useDurak(settings);

    const [shakingCardIndex, setShakingCardIndex] = useState<number | null>(null);

    // 🛡️ THE HANDSHAKE PROTOCOL
    useEffect(() => {
        if (settings?.roomId) {
            socket.emit('request_sync', settings.roomId);
        }
    }, [settings?.roomId]);

    if (!gameState) return (
        <div className="flex items-center justify-center h-full bg-zinc-950">
            <div className="w-8 h-8 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
        </div>
    );

    const isWaiting = gameState.status === 'waiting';
    const isGameOver = gameState.state === 4 || gameState.isEnded;
    const isMyTurn = gameState.currentId === HUMAN_ID;
    const isDefending = HUMAN_ID === gameState.defenderId;
    const isHost = settings.mode === 'single' || gameState.hostId === HUMAN_ID;

    // 📐 SMART SEATING ALGORITHM (The "U-Shape" Arc)
    const getOpponentStyle = (index: number, total: number) => {
        const startAngle = Math.PI * 1.1;
        const endAngle = Math.PI * -0.1;
        const angle = total === 1 ? Math.PI / 2 : startAngle - (index * (startAngle - endAngle) / (total - 1));

        const rx = 40; // Horizontal radius
        const ry = 28; // Vertical radius
        return {
            left: `${50 + rx * Math.cos(angle)}%`,
            top: `${38 - ry * Math.sin(angle)}%`,
            transform: `translate(-50%, -50%) rotate(${(Math.PI / 2 - angle) * 20}deg)`,
            zIndex: 10
        };
    };

    const myHand = (gameState.hands?.[HUMAN_ID] || []).sort((a: any, b: any) => {
        const aT = a.suite === gameState.trumpCard?.suite;
        const bT = b.suite === gameState.trumpCard?.suite;
        return aT === bT ? a.rank - b.rank : aT ? 1 : -1;
    });

    const opponents = gameState.players?.filter((p: any) => p.id !== HUMAN_ID) || [];

    const handleRematch = () => socket.emit('play_again', settings.roomId);

    return (
        <div className="flex flex-col h-full gap-4 relative overflow-hidden select-none animate-in fade-in duration-700">

            {/* MATCH HEADER */}
            <div className="flex justify-between items-center px-4 z-10">
                <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                        <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Trump Asset</span>
                        <div className={`text-lg leading-none ${gameState.trumpCard ? (isRedSuit(gameState.trumpCard.suite) ? 'text-red-500' : 'text-zinc-100') : 'text-zinc-800'}`}>
                            {gameState.trumpCard ? getSuitSymbol(gameState.trumpCard.suite) : '?'}
                        </div>
                    </div>
                    <div className="h-6 w-[1px] bg-white/5 mx-1" />
                    <div className="flex flex-col text-left">
                        <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Deck</span>
                        <span className="text-xs font-black text-zinc-400 tabular-nums">{gameState.stockCount || 0}</span>
                    </div>
                </div>

                <div className="flex flex-col items-end">
                    <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Protocol</span>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${isMyTurn ? 'text-amber-500' : 'text-zinc-500'}`}>
                        {isWaiting ? 'Syncing' : (isMyTurn ? 'Your Move' : 'Opponent')}
                    </span>
                </div>
            </div>

            {/* THE TACTICAL FELT */}
            <div className="bg-[#052c22] flex-grow rounded-[3.5rem] border-[10px] border-zinc-900 shadow-[inset_0_0_120px_rgba(0,0,0,0.8)] relative p-6 flex flex-col justify-between overflow-hidden">

                {/* 🛡️ WAITING OVERLAY */}
                <AnimatePresence>
                    {isWaiting && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 bg-black/40 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center">
                            <div className="relative mb-6">
                                <motion.div animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }} className="w-24 h-24 border border-amber-500/20 border-t-amber-500 rounded-full" />
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-2xl font-black text-amber-500">{gameState.playersJoined}</span>
                                    <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">OF {gameState.maxPlayers}</span>
                                </div>
                            </div>
                            <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}?room=${settings.roomId}`); alert("Link copied."); }} className="px-6 py-3 bg-zinc-950 border border-white/5 rounded-xl text-[9px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-all">Copy Invite Link</button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* OPPONENT POSITIONS */}
                {opponents.map((opp: any, i: number) => {
                    const handSize = gameState.hands?.[opp.id]?.length || 0;
                    const isActive = gameState.currentId === opp.id;
                    return (
                        <div key={opp.id} className="absolute flex flex-col items-center gap-2" style={getOpponentStyle(i, opponents.length)}>
                            <div className={`px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-widest transition-all ${isActive ? 'bg-amber-500 border-amber-400 text-black shadow-lg' : 'bg-black/60 border-white/5 text-zinc-500'}`}>
                                {opp.name}
                            </div>
                            <div className="flex -space-x-6 scale-75 origin-top">
                                {Array.from({ length: Math.min(handSize, 3) }).map((_, idx) => (
                                    <PlayingCard key={idx} isFaceDown className="w-8 h-12 shadow-xl opacity-60" />
                                ))}
                                {handSize > 3 && <div className="text-[10px] font-black text-zinc-600 self-center ml-2">+{handSize - 3}</div>}
                            </div>
                        </div>
                    );
                })}

                {/* COMBAT CENTER */}
                <div className="flex-grow flex items-center justify-center">
                    {!isWaiting && gameState.round && (
                        <div className="flex gap-4 flex-wrap justify-center max-w-[85%] relative z-20">
                            {gameState.round.attackCards.map((atk: any, i: number) => (
                                <div key={i} className="relative w-14 h-20">
                                    <PlayingCard card={atk} />
                                    {gameState.round.defenceCards[i] && (
                                        <motion.div initial={{ y: 20, x: 20, opacity: 0 }} animate={{ y: 10, x: 10, opacity: 1 }} className="absolute inset-0 z-10">
                                            <PlayingCard card={gameState.round.defenceCards[i]} />
                                        </motion.div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* PLAYER INTERACTION */}
                {!isWaiting && (
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 z-30">
                        <button onClick={passOrTake} disabled={!isMyTurn} className={`w-14 h-14 rounded-full border-2 flex items-center justify-center transition-all ${isMyTurn ? 'bg-amber-600 border-amber-400 text-black shadow-xl scale-110 pulse' : 'bg-zinc-900/50 border-white/5 text-zinc-800'}`}>
                            <span className="text-[8px] font-black uppercase rotate-90">{isDefending ? "Take" : "Pass"}</span>
                        </button>
                    </div>
                )}

                {/* PLAYER HAND AREA */}
                <div className="flex justify-center -mb-8 px-10 h-32 relative z-30">
                    <div className="flex -space-x-10">
                        {myHand.map((card: any, i: number) => (
                            <PlayingCard key={i} card={card} interactive={isMyTurn && !isWaiting}
                                className={`hover:-translate-y-8 transition-transform ${shakingCardIndex === i ? 'animate-bounce' : ''}`}
                                onClick={() => { if (!playCard(card) && isMyTurn) { setShakingCardIndex(i); setTimeout(() => setShakingCardIndex(null), 400); } }}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* REACTION TRAY */}
            <div className="flex justify-center gap-6 py-1">
                {EMOJIS.slice(0, 5).map(e => (
                    <button key={e} onClick={() => sendEmoji(e)} className="text-xl grayscale hover:grayscale-0 transition-all active:scale-125">{e}</button>
                ))}
            </div>

            {/* MATCH CONCLUDED MODAL */}
            <AnimatePresence>
                {isGameOver && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[100] bg-zinc-950/90 backdrop-blur-xl flex flex-col items-center justify-center p-10 text-center">
                        <motion.div initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-zinc-900 border border-white/5 p-8 rounded-[3rem] shadow-2xl max-w-xs">
                            <div className="text-5xl mb-6">{gameState.players.some((p: any) => p.id === HUMAN_ID) ? "🤡" : "🏆"}</div>
                            <h2 className="text-xl font-black text-white uppercase tracking-tighter mb-2">Match Concluded</h2>
                            <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest leading-relaxed mb-8">Session terminated. Final tallies recorded in the ledger.</p>
                            <div className="flex flex-col gap-3">
                                {isHost && <button onClick={handleRematch} className="w-full py-4 bg-amber-600 text-black font-black uppercase tracking-[0.3em] text-[10px] rounded-2xl shadow-xl active:scale-95 transition-all">Request Rematch</button>}
                                <button onClick={onLeave} className="w-full py-4 bg-zinc-800 text-zinc-400 font-black uppercase tracking-[0.3em] text-[10px] rounded-2xl border border-white/5">Return to Lobby</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <button onClick={onLeave} className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-700 hover:text-rose-500 transition-colors py-2 text-center">Terminate Session</button>
        </div>
    );
}