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
    // Forces the server to send the current room state as soon as this component mounts.
    useEffect(() => {
        if (settings?.roomId) {
            console.log("🛰️ Requesting tactical synchronization for Sector:", settings.roomId);
            socket.emit('request_sync', settings.roomId);
        }
    }, [settings?.roomId]);

    // 🛡️ PHASE 0: INITIAL BOOT
    // This only shows for a split second while the handshake is in flight.
    if (!gameState) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                <div className="w-10 h-10 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
                <p className="text-zinc-600 font-black uppercase tracking-[0.3em] text-[10px]">Establishing Secure Link...</p>
            </div>
        );
    }

    const isWaiting = gameState.status === 'waiting';
    const isMyTurn = gameState.currentId === HUMAN_ID;
    const isGameOver = gameState.state === 4;
    const isDefending = HUMAN_ID === gameState.defenderId;

    const myHandRaw = gameState.hands ? gameState.hands[HUMAN_ID] || [] : [];
    const myHand = [...myHandRaw].sort((a, b) => {
        const aIsTrump = a.suite === gameState.trumpCard?.suite;
        const bIsTrump = b.suite === gameState.trumpCard?.suite;
        if (aIsTrump && !bIsTrump) return 1;
        if (!aIsTrump && bIsTrump) return -1;
        return a.rank - b.rank;
    });

    const opponents = gameState.players?.filter((p: any) => p.id !== HUMAN_ID) || [];

    const handleCardClick = (card: any, index: number) => {
        const success = playCard(card);
        if (!success && isMyTurn) {
            setShakingCardIndex(index);
            setTimeout(() => setShakingCardIndex(null), 400);
        }
    };

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
                    <div className="flex flex-col">
                        <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Deck</span>
                        <span className="text-xs font-black text-zinc-400 tabular-nums">{gameState.stockCount || 0}</span>
                    </div>
                </div>

                <div className="flex flex-col items-end">
                    <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Status</span>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${isWaiting ? 'text-zinc-500' : (isMyTurn ? 'text-amber-500' : 'text-zinc-400')}`}>
                        {isWaiting ? 'Personnel Link' : (isMyTurn ? 'Your Move' : 'Opponent Move')}
                    </span>
                </div>
            </div>

            {/* THE TACTICAL FELT */}
            <div className="bg-[#052c22] flex-grow rounded-[3.5rem] border-[10px] border-zinc-900 shadow-[inset_0_0_120px_rgba(0,0,0,0.8)] relative p-6 flex flex-col justify-between overflow-hidden">

                {/* 🛡️ MULTIPLAYER PERSONNEL OVERLAY */}
                <AnimatePresence>
                    {isWaiting && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-50 bg-black/40 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center"
                        >
                            <div className="relative mb-6">
                                <motion.div animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }} className="w-24 h-24 border border-amber-500/20 border-t-amber-500 rounded-full" />
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-2xl font-black text-amber-500 tabular-nums">{gameState.playersJoined}</span>
                                    <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">OF {gameState.maxPlayers}</span>
                                </div>
                            </div>
                            <h2 className="text-[10px] font-black tracking-[0.5em] text-zinc-300 uppercase mb-4">Awaiting Personnel</h2>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(`${window.location.origin}?room=${settings.roomId}`);
                                    alert("Sector link copied to clipboard.");
                                }}
                                className="px-6 py-3 bg-zinc-900 border border-white/5 rounded-xl text-[9px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-all active:scale-95"
                            >
                                Copy Invite Link
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* OPPONENT SLOTS */}
                <div className="flex justify-around items-start pt-2">
                    {opponents.map((opp: any) => {
                        const handSize = gameState.hands?.[opp.id]?.length || 0;
                        const isActive = gameState.currentId === opp.id;
                        return (
                            <div key={opp.id} className="flex flex-col items-center gap-2 opacity-80">
                                <div className={`px-3 py-1 rounded-full border text-[8px] font-black uppercase tracking-widest transition-all ${isActive ? 'bg-amber-500 border-amber-400 text-black shadow-lg' : 'bg-black/60 border-white/5 text-zinc-500'}`}>
                                    {opp.name}
                                </div>
                                <div className="flex -space-x-6">
                                    {Array.from({ length: Math.min(handSize, 3) }).map((_, i) => (
                                        <PlayingCard key={i} isFaceDown className="w-8 h-12 rotate-2 opacity-40 shadow-xl" />
                                    ))}
                                    {handSize > 3 && <div className="text-[9px] font-black text-zinc-600 self-center ml-2">+{handSize - 3}</div>}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* COMBAT CENTER */}
                <div className="flex-grow flex items-center justify-center p-4">
                    {!isWaiting && gameState.round && (
                        <div className="flex gap-4 flex-wrap justify-center max-w-[85%]">
                            {gameState.round.attackCards.map((attack: any, i: number) => (
                                <div key={i} className="relative w-16 h-24">
                                    <PlayingCard card={attack} className="absolute inset-0 shadow-2xl" />
                                    {gameState.round.defenceCards[i] && (
                                        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 12, x: 12, opacity: 1 }}>
                                            <PlayingCard card={gameState.round.defenceCards[i]} className="absolute inset-0 z-10 shadow-2xl" />
                                        </motion.div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* PLAYER INTERACTION DECK */}
                {!isWaiting && (
                    <div className="absolute right-6 top-1/2 -translate-y-1/2">
                        <button
                            onClick={passOrTake}
                            disabled={!isMyTurn}
                            className={`w-16 h-16 rounded-full border-2 flex items-center justify-center transition-all ${isMyTurn ? 'bg-amber-600 border-amber-400 text-black shadow-xl scale-110' : 'bg-zinc-900/50 border-white/5 text-zinc-800'}`}
                        >
                            <span className="text-[9px] font-black uppercase rotate-90 whitespace-nowrap tracking-tighter">
                                {isDefending ? "Take" : "Pass"}
                            </span>
                        </button>
                    </div>
                )}

                {/* PLAYER HAND AREA */}
                <div className="flex justify-center -mb-8 px-10 h-32 relative">
                    <div className="flex -space-x-10">
                        {myHand.map((card, i) => (
                            <PlayingCard
                                key={`${card.suite}-${card.rank}`}
                                card={card}
                                interactive={isMyTurn && !isWaiting}
                                isDimmed={!isMyTurn || isWaiting}
                                className={`${shakingCardIndex === i ? 'animate-bounce' : ''} hover:-translate-y-8 transition-transform`}
                                onClick={() => handleCardClick(card, i)}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* REACTION SYSTEM */}
            <div className="flex justify-center gap-6 py-2">
                {EMOJIS.slice(0, 5).map(e => (
                    <button key={e} onClick={() => sendEmoji(e)} className="text-xl grayscale hover:grayscale-0 transition-all active:scale-125">
                        {e}
                    </button>
                ))}
            </div>

            <button onClick={onLeave} className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-700 hover:text-rose-500 transition-colors py-2 text-center">
                Abort Current Operation
            </button>
        </div>
    );
}