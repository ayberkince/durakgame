"use client";
import React, { useState } from 'react';
import { useDurak } from './useDurak';
import PlayingCard from './PlayingCard';
import { motion, AnimatePresence } from 'framer-motion';

const getSuitSymbol = (suite: number) => ['♣️', '♦️', '♥️', '♠️'][suite - 1] || '?';
const isRedSuit = (suite: number) => suite === 2 || suite === 3;

export default function GameBoard({ settings, onLeave }: { settings: any, onLeave: () => void }) {
    const { gameState, playCard, passOrTake, HUMAN_ID } = useDurak(settings);
    const [shakingCardIndex, setShakingCardIndex] = useState<number | null>(null);

    if (!gameState || HUMAN_ID === null) return (
        <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-10">
            <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-zinc-300 font-bold uppercase tracking-widest text-sm animate-pulse">Waiting for table to fill...</p>
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

    // FIX 1: Safer Opponent Positioning
    const getOpponentStyle = (index: number, totalBots: number) => {
        // If it's a 1v1 match, pin them safely near the top inside the green board
        if (totalBots === 1) {
            return { top: '15%', left: '50%', transform: 'translate(-50%, -50%)' };
        }
        // If >1 opponents, create a flatter arc so they don't clip the top
        const startAngle = Math.PI * 0.85;
        const endAngle = Math.PI * 0.15;
        let angle = startAngle - (index * (startAngle - endAngle) / (totalBots - 1));
        const rx = 40, ry = 25, cx = 50, cy = 40;
        return {
            top: `${cy - ry * Math.sin(angle)}%`,
            left: `${cx + rx * Math.cos(angle)}%`,
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
                .animate-error-shake {
                    animation: error-shake-smooth 0.4s ease-in-out;
                    z-index: 50; 
                }
            `}</style>

            <AnimatePresence>
                {isGameOver && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute inset-0 z-50 bg-black/80 rounded-xl flex flex-col items-center justify-center p-6 text-center backdrop-blur-sm"
                    >
                        <h2 className="text-4xl font-extrabold text-white mb-4">GAME OVER</h2>
                        <p className="text-xl text-slate-300 mb-8">
                            {gameState.players.length === 1 && gameState.players[0].id === HUMAN_ID
                                ? "🤡 You are the Durak! (You Lost)"
                                : "🏆 You escaped! (You Won)"}
                        </p>
                        <button onClick={onLeave} className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold py-3 px-8 rounded-xl shadow-lg hover:scale-105 transition-transform">
                            Return to Lobby
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Top Info Bar */}
            <div className="flex justify-between items-center text-xs text-slate-400 z-10 mb-1 px-1">
                <div className="flex items-center gap-3">
                    <span className="font-semibold">Cards left: {gameState.stockCount}</span>
                    {gameState.trumpCard && (
                        <div className="flex items-center gap-1 bg-black/40 px-2 py-1 rounded-md border border-slate-600 shadow-sm">
                            <span className="font-bold text-slate-300">Trump:</span>
                            <span className={`text-base leading-none ${isRedSuit(gameState.trumpCard.suite) ? 'text-red-500' : 'text-slate-100'}`}>
                                {getSuitSymbol(gameState.trumpCard.suite)}
                            </span>
                        </div>
                    )}
                </div>
                <span className={isMyTurn && !isGameOver ? "text-green-400 font-bold tracking-wider" : "text-red-400 font-bold tracking-wider"}>
                    {isGameOver ? "FINISHED" : (isMyTurn ? "YOUR TURN" : "OPPONENT'S TURN")}
                </span>
            </div>

            {/* The Green Felt Table */}
            <div className="bg-emerald-800 flex-grow rounded-xl border-4 border-emerald-900 p-4 relative shadow-[inset_0_0_50px_rgba(0,0,0,0.5)] flex flex-col justify-between">

                {bots.map((bot: any, index: number) => {
                    const botHandSize = gameState.hands ? gameState.hands[bot.id]?.length || 0 : 0;
                    const isActive = gameState.currentId === bot.id && !isGameOver;
                    if (botHandSize === 0 && gameState.stockCount === 0) return null;

                    return (
                        <div key={bot.id} className="absolute flex flex-col items-center z-10 transition-all duration-500" style={getOpponentStyle(index, bots.length)}>
                            <span className={`text-[10px] mb-2 font-bold bg-black/50 px-3 py-1 rounded-full ${isActive ? 'text-green-300 scale-110 shadow-[0_0_10px_rgba(74,222,128,0.5)]' : 'text-slate-300'}`}>
                                {bot.name}
                            </span>
                            <div className="flex -space-x-10 sm:-space-x-12">
                                <AnimatePresence>
                                    {Array.from({ length: botHandSize }).map((_, i) => (
                                        <PlayingCard
                                            key={`${bot.id}-card-${i}`}
                                            isFaceDown
                                            layout
                                            initial={{ opacity: 0, y: -20 }}
                                            animate={{ opacity: 1, y: isActive ? -8 : 0 }}
                                            exit={{ opacity: 0, y: 50, scale: 0.5 }}
                                            className="w-[45px] h-[65px]"
                                        />
                                    ))}
                                </AnimatePresence>
                            </div>
                        </div>
                    )
                })}

                <div className="flex flex-col items-center justify-center gap-6 flex-grow mt-10 z-20 pointer-events-none pb-12">

                    {/* Played Cards */}
                    <div className="flex gap-4 min-h-[6rem] items-center justify-center w-full flex-wrap pointer-events-auto">
                        <AnimatePresence>
                            {gameState.round.attackCards.map((attackCard: any, i: number) => {
                                const defenseCard = gameState.round.defenceCards[i];
                                return (
                                    <motion.div
                                        key={`table-${attackCard.suite}-${attackCard.rank}`}
                                        layout
                                        initial={{ opacity: 0, scale: 0.5, y: -50 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, x: 500, rotate: 120, transition: { duration: 0.4 } }}
                                        className="relative w-[70px] h-[100px]"
                                    >
                                        <PlayingCard card={attackCard} className="absolute top-0 left-0 shadow-[0_5px_15px_rgba(0,0,0,0.4)]" />
                                        {defenseCard && (
                                            <PlayingCard
                                                card={defenseCard}
                                                initial={{ opacity: 0, x: 20, y: -20, rotate: 15 }}
                                                animate={{ opacity: 1, x: 0, y: 0, rotate: 0 }}
                                                className="absolute top-4 left-4 z-10 shadow-[5px_5px_15px_rgba(0,0,0,0.6)]"
                                            />
                                        )}
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>

                    {/* FIX 2: Widen deck container and wrap Trump Card rotation securely */}
                    <div className="flex justify-center items-center relative h-28 w-36 mt-4 pointer-events-auto">
                        {gameState.stockCount > 0 ? (
                            <>
                                {/* Trump Card - Safely rotated via wrapper div */}
                                <div className="absolute left-[-15px] top-4 rotate-90 z-0 shadow-[0_0_10px_rgba(0,0,0,0.5)]">
                                    <PlayingCard card={gameState.trumpCard} />
                                </div>
                                {/* The Deck */}
                                <div className="absolute right-2 z-10 flex flex-col items-center group cursor-pointer hover:-translate-y-2 transition-all" onClick={passOrTake}>
                                    <PlayingCard isFaceDown className="shadow-[5px_5px_15px_rgba(0,0,0,0.5)]" />
                                    <div className="absolute -bottom-4 bg-blue-900 text-blue-300 text-[10px] font-bold px-3 py-1 rounded-full border border-blue-400 group-hover:bg-blue-600 group-hover:text-white shadow-lg">
                                        {isDefending ? "TAKE" : "PASS"}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <button onClick={passOrTake} className="bg-blue-900 border-2 border-blue-300 text-blue-300 font-bold px-6 py-3 rounded-full shadow-lg hover:bg-blue-800 transition-colors pointer-events-auto mt-4">
                                {isDefending ? "TAKE CARDS" : "PASS ATTACK"}
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex justify-center -mb-4 min-h-[6rem] flex-wrap z-30 transition-opacity duration-300">
                    <AnimatePresence>
                        {myHand.map((card: any, index: number) => (
                            <PlayingCard
                                key={`${card.suite}-${card.rank}`}
                                card={card}
                                layout
                                initial={{ opacity: 0, y: 100, x: -50 }}
                                animate={{ opacity: 1, y: 0, x: 0, transition: { delay: index * 0.05 } }}
                                exit={{ opacity: 0, scale: 0.5, y: -100 }}
                                interactive={isMyTurn}
                                isDimmed={!isMyTurn}
                                className={`-ml-8 first:ml-0 shadow-[0_0_20px_rgba(0,0,0,0.4)] ${shakingCardIndex === index ? 'animate-error-shake' : ''}`}
                                onClick={() => handleCardClick(card, index)}
                                onAnimationEnd={() => setShakingCardIndex(null)}
                            />
                        ))}
                    </AnimatePresence>
                </div>
            </div>

            <button onClick={onLeave} className="bg-red-900/50 text-red-400 hover:bg-red-600 hover:text-white p-3 rounded-lg font-bold transition-colors z-10">
                Leave Game
            </button>
        </div>
    );
}