"use client";
import React, { useState } from 'react';
import { useDurak } from './useDurak';
import PlayingCard from './PlayingCard';
import { motion, AnimatePresence } from 'framer-motion';

const getSuitSymbol = (suite: number) => ['♣️', '♦️', '♥️', '♠️'][suite - 1] || '?';
const isRedSuit = (suite: number) => suite === 2 || suite === 3;
const EMOJIS = ['👋', '😂', '🤡', '💰', '🃏', '😡', '🤐', '🤝'];

export default function GameBoard({ settings, onLeave }: { settings: any, onLeave: () => void }) {
    // 🔥 FIX: Destructure with safety fallback for activeEmojis
    const {
        gameState,
        playCard,
        passOrTake,
        HUMAN_ID,
        sendEmoji,
        activeEmojis = {}
    } = useDurak(settings);

    const [shakingCardIndex, setShakingCardIndex] = useState<number | null>(null);

    if (!gameState || HUMAN_ID === null) return (
        <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-10">
            <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-zinc-300 font-bold uppercase tracking-widest text-sm animate-pulse">Establishing Secure Link...</p>
        </div>
    );

    const isMyTurn = gameState.currentId === HUMAN_ID;
    const isGameOver = gameState.state === 4;
    const isDefending = gameState.currentId === gameState.defenderId;

    const myHandRaw = gameState.hands ? gameState.hands[HUMAN_ID] || [] : [];
    const myHand = [...myHandRaw].sort((a, b) => {
        const aIsTrump = a.suite === gameState.trumpCard?.suite;
        const bIsTrump = b.suite === gameState.trumpCard?.suite;
        if (aIsTrump && !bIsTrump) return 1;
        if (!aIsTrump && bIsTrump) return -1;
        return a.rank - b.rank;
    });

    const bots = gameState.players.filter((p: any) => p.id !== HUMAN_ID);

    // 🔥 FIX: Professional seating for 1 to 5 opponents
    const getOpponentStyle = (index: number, totalBots: number) => {
        if (totalBots === 1) return { top: '12%', left: '50%', transform: 'translate(-50%, -50%)' };

        // Distribution arc: Far left to far right
        const startAngle = Math.PI * 0.95;
        const endAngle = Math.PI * 0.05;
        const step = (startAngle - endAngle) / (totalBots - 1);
        const angle = startAngle - (index * step);

        const rx = 44; // horizontal stretch
        const ry = 25; // vertical height
        return {
            top: `${35 - ry * Math.sin(angle)}%`,
            left: `${50 + rx * Math.cos(angle)}%`,
            transform: 'translate(-50%, -50%)'
        };
    };

    const triggerHaptic = (pattern: number | number[]) => {
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(pattern);
    };

    const handleCardClick = (card: any, index: number) => {
        const success = playCard(card);
        if (success) {
            triggerHaptic(15);
        } else if (isMyTurn) {
            setShakingCardIndex(index);
            triggerHaptic([50, 50, 50]);
        }
    };

    return (
        <div className="flex flex-col h-full gap-4 relative overflow-hidden">
            <style>{`
                @keyframes error-shake-smooth {
                    0%, 100% { transform: translate3d(0, 0, 0) scale(1.1); }
                    25% { transform: translate3d(-8px, 0, 0) scale(1.1) rotate(-3deg); }
                    50% { transform: translate3d(8px, 0, 0) scale(1.1) rotate(3deg); }
                    75% { transform: translate3d(-8px, 0, 0) scale(1.1) rotate(-3deg); }
                }
                .animate-error-shake { animation: error-shake-smooth 0.4s ease-in-out; z-index: 50; }
            `}</style>

            {/* GAME OVER MODAL */}
            <AnimatePresence>
                {isGameOver && (
                    <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="absolute inset-0 z-50 bg-black/90 rounded-xl flex flex-col items-center justify-center p-6 text-center backdrop-blur-md">
                        <div className="w-24 h-24 bg-zinc-900 border-2 border-amber-500 rounded-full flex items-center justify-center text-4xl mb-6 shadow-[0_0_30px_rgba(245,158,11,0.3)]">
                            {gameState.players.length === 1 && gameState.players[0].id === HUMAN_ID ? "🤡" : "🏆"}
                        </div>
                        <h2 className="text-3xl font-black text-white mb-2 tracking-tighter uppercase">Match Concluded</h2>
                        <p className="text-zinc-400 mb-8 font-medium">
                            {gameState.players.length === 1 && gameState.players[0].id === HUMAN_ID
                                ? "You are the Durak. The house takes the pot."
                                : "You escaped. Profits have been wired to your dossier."}
                        </p>
                        <button onClick={onLeave} className="bg-amber-600 text-black font-black uppercase tracking-widest text-xs py-4 px-10 rounded-xl hover:bg-amber-500 transition-all active:scale-95 shadow-lg">
                            Close Match
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* TOP INFO BAR */}
            <div className="flex justify-between items-center text-[10px] text-zinc-500 z-10 mb-1 px-1 uppercase tracking-widest font-bold">
                <div className="flex items-center gap-4">
                    <span>Deck: {gameState.stockCount}</span>
                    {gameState.trumpCard && (
                        <div className="flex items-center gap-1.5 bg-zinc-900/80 px-2 py-1 rounded border border-white/5">
                            <span className="text-zinc-600">Trump</span>
                            <span className={`text-sm ${isRedSuit(gameState.trumpCard.suite) ? 'text-red-500' : 'text-zinc-100'}`}>
                                {getSuitSymbol(gameState.trumpCard.suite)}
                            </span>
                        </div>
                    )}
                </div>
                <div className={`flex items-center gap-2 ${isMyTurn && !isGameOver ? 'text-amber-500' : 'text-zinc-700'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${isMyTurn && !isGameOver ? 'bg-amber-500 animate-pulse' : 'bg-zinc-800'}`}></div>
                    {isGameOver ? "CLOSED" : (isMyTurn ? "YOUR MOVE" : "WAITING")}
                </div>
            </div>

            {/* THE GREEN FELT TABLE */}
            <div className="bg-[#064e3b] flex-grow rounded-[2.5rem] border-[6px] border-[#022c22] p-4 relative shadow-[inset_0_0_80px_rgba(0,0,0,0.8)] flex flex-col justify-between">

                {/* OPPONENTS (1-5) */}
                {bots.map((bot: any, index: number) => {
                    const botHandSize = gameState.hands ? gameState.hands[bot.id]?.length || 0 : 0;
                    const isActive = gameState.currentId === bot.id && !isGameOver;
                    if (botHandSize === 0 && gameState.stockCount === 0) return null;

                    return (
                        <div key={bot.id} className="absolute flex flex-col items-center z-10" style={getOpponentStyle(index, bots.length)}>
                            <div className="relative group">
                                <span className={`text-[10px] mb-2 font-black px-3 py-1 rounded-full border transition-all duration-300 ${isActive ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.4)]' : 'bg-black/60 text-zinc-400 border-white/5'}`}>
                                    {bot.name}
                                </span>
                                {/* FLOATING EMOJI BUBBLE */}
                                <AnimatePresence>
                                    {activeEmojis?.[bot.id] && (
                                        <motion.div initial={{ opacity: 0, scale: 0, y: 10 }} animate={{ opacity: 1, scale: 1, y: -35 }} exit={{ opacity: 0, scale: 0 }} className="absolute left-1/2 -translate-x-1/2 bg-white text-black px-2 py-1 rounded-lg text-lg font-bold shadow-2xl z-50">
                                            {activeEmojis[bot.id]}
                                            <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-white rotate-45"></div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                            <div className="flex -space-x-8 mt-1">
                                {Array.from({ length: Math.min(botHandSize, 6) }).map((_, i) => (
                                    <PlayingCard key={`${bot.id}-card-${i}`} isFaceDown className="w-[35px] h-[50px] rotate-[2deg]" />
                                ))}
                                {botHandSize > 6 && <span className="text-[10px] text-zinc-500 font-bold self-center ml-2">+{botHandSize - 6}</span>}
                            </div>
                        </div>
                    )
                })}

                {/* CENTER TABLE AREA */}
                <div className="flex flex-col items-center justify-center gap-6 flex-grow z-20 pointer-events-none">
                    <div className="flex gap-4 min-h-[120px] items-center justify-center w-full flex-wrap pointer-events-auto">
                        <AnimatePresence>
                            {gameState.round.attackCards.map((attackCard: any, i: number) => {
                                const defenseCard = gameState.round.defenceCards[i];
                                return (
                                    <motion.div key={`table-${attackCard.suite}-${attackCard.rank}`} layout initial={{ opacity: 0, scale: 0, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, x: 200, rotate: 45 }} className="relative w-[60px] h-[85px]">
                                        <PlayingCard card={attackCard} className="absolute top-0 left-0 shadow-xl" />
                                        {defenseCard && (
                                            <PlayingCard card={defenseCard} initial={{ x: 15, y: -15, rotate: 10, opacity: 0 }} animate={{ x: 8, y: 8, rotate: 5, opacity: 1 }} className="absolute z-10 shadow-2xl" />
                                        )}
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>

                    {/* DECK & ACTIONS */}
                    <div className="flex justify-center items-center relative h-24 w-32 pointer-events-auto">
                        {gameState.stockCount > 0 ? (
                            <>
                                <div className="absolute left-[-20px] rotate-90 opacity-40">
                                    <PlayingCard card={gameState.trumpCard} className="w-[50px] h-[70px]" />
                                </div>
                                <div className="absolute right-0 flex flex-col items-center group cursor-pointer" onClick={passOrTake}>
                                    <PlayingCard isFaceDown className="w-[55px] h-[75px] shadow-2xl group-hover:-translate-y-1 transition-transform" />
                                    <div className="absolute -bottom-6 bg-zinc-900 border border-white/10 text-white text-[8px] font-black tracking-widest px-3 py-1 rounded-full uppercase shadow-xl group-hover:bg-amber-600 group-hover:text-black transition-colors">
                                        {isDefending ? "Take" : "Pass"}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <button onClick={passOrTake} className="bg-zinc-950/80 border border-white/10 text-zinc-400 font-black text-[10px] tracking-widest px-6 py-3 rounded-xl hover:bg-amber-600 hover:text-black transition-all">
                                {isDefending ? "TAKE CARDS" : "YIELD ATTACK"}
                            </button>
                        )}
                    </div>
                </div>

                {/* MY HAND AREA */}
                <div className="flex justify-center -mb-2 min-h-[100px] flex-wrap z-30 relative px-4">
                    {/* MY FLOATING EMOJI */}
                    <AnimatePresence>
                        {activeEmojis?.[HUMAN_ID] && (
                            <motion.div initial={{ opacity: 0, y: 0 }} animate={{ opacity: 1, y: -80 }} exit={{ opacity: 0 }} className="absolute left-1/2 -translate-x-1/2 bg-amber-500 p-2 rounded-full shadow-2xl z-50 text-3xl border-2 border-white">
                                {activeEmojis[HUMAN_ID]}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <AnimatePresence>
                        {myHand.map((card: any, index: number) => (
                            <PlayingCard
                                key={`${card.suite}-${card.rank}`}
                                card={card}
                                layout
                                initial={{ opacity: 0, y: 50 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.5 }}
                                interactive={isMyTurn}
                                isDimmed={!isMyTurn}
                                className={`-ml-8 first:ml-0 ${shakingCardIndex === index ? 'animate-error-shake' : ''}`}
                                onClick={() => handleCardClick(card, index)}
                                onAnimationEnd={() => setShakingCardIndex(null)}
                            />
                        ))}
                    </AnimatePresence>
                </div>
            </div>

            {/* REACTION TRAY */}
            <div className="absolute left-2 bottom-32 flex flex-col gap-1.5 z-50">
                {EMOJIS.map((emoji) => (
                    <motion.button
                        key={emoji}
                        whileHover={{ scale: 1.2, x: 5 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => sendEmoji(emoji)}
                        className="w-8 h-8 bg-black/60 backdrop-blur-md border border-white/5 rounded-full flex items-center justify-center text-sm shadow-xl hover:bg-zinc-800 transition-colors"
                    >
                        {emoji}
                    </motion.button>
                ))}
            </div>

            <button onClick={onLeave} className="bg-zinc-950/40 text-zinc-600 hover:text-rose-500 py-3 rounded-xl text-[9px] font-black transition-all z-10 border border-white/5 uppercase tracking-[0.2em]">
                Terminate Session
            </button>
        </div>
    );
}