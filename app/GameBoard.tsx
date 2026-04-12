"use client";
import React from 'react';
import { useDurak } from './useDurak';
import { formatCard } from './utils';

export default function GameBoard({ settings, onLeave }: { settings: any, onLeave: () => void }) {
    // 🛠️ THE FIX IS HERE: We are now grabbing 'report' and 'autoPlay' from the hook!
    const { game, gameState, playCard, passOrTake, HUMAN_ID, report, autoPlay } = useDurak(settings);

    if (!gameState) return <div className="text-white text-center p-10">Dealing cards...</div>;

    const humanPlayer = game.getPlayers().find(p => p.getId() === HUMAN_ID);
    const myHand = humanPlayer ? game.getPlayerHand(humanPlayer).toObject().cards : [];
    const bots = game.getPlayers().filter(p => p.getId() !== HUMAN_ID);
    const isMyTurn = gameState.currentId === HUMAN_ID;

    // Is the game completely over? (State 4 = Ended)
    const isGameOver = gameState.state === 4;

    const getOpponentStyle = (index: number, totalBots: number) => {
        const startAngle = Math.PI * 0.9;
        const endAngle = Math.PI * 0.1;
        let angle = totalBots === 1 ? Math.PI / 2 : startAngle - (index * (startAngle - endAngle) / (totalBots - 1));
        const rx = 40, ry = 35, cx = 50, cy = 40;
        return {
            top: `${cy - ry * Math.sin(angle)}%`,
            left: `${cx + rx * Math.cos(angle)}%`,
            transform: 'translate(-50%, -50%)'
        };
    };

    const isDefending = gameState.currentId === gameState.defenderId;

    return (
        <div className="flex flex-col h-full gap-4 relative">

            {/* 🤖 DIAGNOSTIC REPORT PANEL (Only shows in AutoPlay mode) */}
            {autoPlay && report && (
                <div className="absolute top-16 left-0 right-0 z-40 bg-black/90 p-4 rounded-xl border border-red-500/50 max-h-48 overflow-y-auto text-xs font-mono pointer-events-none">
                    <h3 className="text-red-400 font-bold mb-2">⚙️ DIAGNOSTIC LOG</h3>
                    {report.slice(-10).map((log, i) => (
                        <div key={i} className={log.includes("ERROR") ? "text-red-500 font-bold" : "text-green-300/70"}>
                            {log}
                        </div>
                    ))}
                </div>
            )}

            {/* GAME OVER OVERLAY */}
            {isGameOver && (
                <div className="absolute inset-0 z-50 bg-black/80 rounded-xl flex flex-col items-center justify-center p-6 text-center backdrop-blur-sm">
                    <h2 className="text-4xl font-extrabold text-white mb-4">GAME OVER</h2>
                    <p className="text-xl text-slate-300 mb-8">
                        {gameState.players.length === 1 && gameState.players[0].id === HUMAN_ID
                            ? "🤡 You are the Durak! (You Lost)"
                            : "🏆 You escaped! (You Won)"}
                    </p>
                    <button onClick={onLeave} className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold py-3 px-8 rounded-xl shadow-lg hover:scale-105 transition-transform">
                        Return to Lobby
                    </button>
                </div>
            )}

            <div className="flex justify-between items-center text-xs text-slate-400">
                <span>Cards left: {gameState.stockCount}</span>
                <span className={isMyTurn && !isGameOver ? "text-green-400 font-bold" : "text-red-400 font-bold"}>
                    {isGameOver ? "FINISHED" : (isMyTurn ? "YOUR TURN" : "OPPONENT'S TURN")}
                </span>
            </div>

            <div className="bg-emerald-800 flex-grow rounded-xl border-4 border-emerald-900 p-4 relative shadow-[inset_0_0_50px_rgba(0,0,0,0.5)] flex flex-col justify-between overflow-hidden">

                {/* Opponents */}
                {bots.map((bot, index) => {
                    const botHandSize = game.getPlayerHand(bot).size();
                    const isActive = gameState.currentId === bot.getId() && !isGameOver;
                    if (botHandSize === 0 && gameState.stockCount === 0) return null;

                    return (
                        <div key={bot.getId()} className="absolute flex flex-col items-center z-10 transition-all duration-500" style={getOpponentStyle(index, bots.length)}>
                            <span className={`text-xs mb-1 font-bold bg-black/40 px-2 py-0.5 rounded-full ${isActive ? 'text-green-300 scale-110 shadow-[0_0_10px_rgba(74,222,128,0.5)]' : 'text-slate-300'}`}>
                                {bot.getName()}
                            </span>
                            <div className="flex -space-x-6">
                                {Array.from({ length: botHandSize }).map((_, i) => (
                                    <div key={i} className={`w-10 h-14 bg-blue-900 rounded-sm shadow-md border border-blue-300 ${isActive ? '-translate-y-2' : ''} transition-transform`} />
                                ))}
                            </div>
                        </div>
                    )
                })}

                {/* Center Play Area */}
                <div className="flex flex-col items-center justify-center gap-6 flex-grow mt-10 z-20 pointer-events-none pb-16">

                    {/* Table Cards */}
                    <div className="flex gap-4 min-h-[6rem] items-center justify-center w-full flex-wrap pointer-events-auto">
                        {gameState.round.attackCards.map((attackCard: any, i: number) => {
                            const defenseCard = gameState.round.defenceCards[i];
                            return (
                                <div key={i} className="relative w-16 h-24">
                                    <div className="w-16 h-24 bg-white rounded-md shadow-xl border border-gray-300 flex items-center justify-center text-black font-bold absolute top-0 left-0 text-xl">
                                        {formatCard(attackCard)}
                                    </div>
                                    {defenseCard && (
                                        <div className="w-16 h-24 bg-slate-100 rounded-md shadow-[5px_5px_15px_rgba(0,0,0,0.4)] border border-gray-400 flex items-center justify-center text-black font-bold absolute top-4 left-4 z-10 text-xl">
                                            {formatCard(defenseCard)}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Trump & Deck */}
                    <div className="flex justify-center items-center relative h-24 w-40 mt-8 pointer-events-auto">
                        {gameState.stockCount > 0 ? (
                            <>
                                <div className="w-16 h-24 bg-white rounded-md shadow-lg flex items-center justify-center -rotate-90 absolute left-2 text-black font-extrabold text-2xl z-0 border border-gray-300">
                                    {formatCard(gameState.trumpCard)}
                                </div>
                                <div className="w-16 h-24 bg-blue-900 rounded-md shadow-[5px_5px_15px_rgba(0,0,0,0.6)] border-2 border-blue-300 absolute right-6 z-10 flex items-center justify-center cursor-pointer hover:-translate-y-2 transition-all" onClick={passOrTake}>
                                    <span className="text-blue-300 font-bold text-xs text-center leading-tight">
                                        {isDefending ? "TAKE" : "PASS"}
                                    </span>
                                </div>
                            </>
                        ) : (
                            <button onClick={passOrTake} className="bg-blue-900 border-2 border-blue-300 text-blue-300 font-bold px-6 py-3 rounded-full shadow-lg hover:bg-blue-800 transition-colors pointer-events-auto">
                                {isDefending ? "TAKE CARDS" : "PASS ATTACK"}
                            </button>
                        )}
                    </div>
                </div>

                {/* Your Hand */}
                <div className="flex justify-center -mb-2 min-h-[6rem] flex-wrap z-30">
                    {myHand.map((card: any, i: number) => (
                        <div
                            key={i}
                            onClick={() => playCard(card)}
                            className="w-16 h-24 bg-white rounded-md shadow-xl border border-gray-300 -ml-6 first:ml-0 flex items-center justify-center cursor-pointer hover:-translate-y-6 hover:z-50 transition-all text-black font-bold text-lg"
                        >
                            {formatCard(card)}
                        </div>
                    ))}
                </div>
            </div>

            <button onClick={onLeave} className="bg-red-900/50 text-red-400 hover:bg-red-600 hover:text-white p-3 rounded-lg font-bold transition-colors">
                Leave Game
            </button>
        </div>
    );
}