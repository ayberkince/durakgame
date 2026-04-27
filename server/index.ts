import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import Redis from 'ioredis';
import { createAdapter } from '@socket.io/redis-adapter';

// Engine & Model Imports
import { Game } from '../src/engine/Game';
import { Player } from '../src/engine/Player';
import { Card } from '../src/engine/Card';
import { UserModel } from './models/User';

dotenv.config({ path: './server/.env' });
const PORT = process.env.PORT || 3002;

const app = express();
app.use(cors({ origin: "http://localhost:3000", credentials: true }));

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: { origin: "http://localhost:3000", methods: ["GET", "POST"], credentials: true },
    transports: ['websocket'],
});

mongoose.connect(process.env.MONGODB_URI!).then(() => console.log("🌌 [ATLAS] Cloud Ledger Synchronized"));

const activeRooms = new Map<string, any>();

// --- 🛠️ EXECUTIVE ENGINE ORCHESTRATION ---

/**
 * 🤖 BOT LOGIC
 * Aggressive asset management: play lowest rank cards first.
 */
const executeBotAI = (room: any) => {
    const game = room.gameInstance;
    const state = game.toObject();
    const botPlayer = game.getPlayers().find((p: any) => p.getId() === state.currentId);
    if (!botPlayer) return;

    const hand = game.getPlayerHand(botPlayer).toObject().cards;
    const sorted = [...hand].sort((a: any, b: any) => a.rank - b.rank);

    let moved = false;
    for (const c of sorted) {
        if (game.act(new Card(c.suite, c.rank))) { moved = true; break; }
    }
    if (!moved) state.currentId === state.defenderId ? game.take() : game.pass();
};

/**
 * 📡 STATE DISPATCHER
 * Handles Fog of War, End-Game checks, and AI triggers.
 */
const broadcastGameState = (roomId: string) => {
    const room = activeRooms.get(roomId);
    if (!room) return;

    // 🛡️ Waiting State: Personnel Link UI
    if (!room.gameStarted) {
        return io.to(roomId).emit('game_state_update', {
            status: 'waiting',
            playersJoined: room.players.length,
            maxPlayers: room.settings.players,
            roomId: room.id
        });
    }

    try {
        const engineState = room.gameInstance.toObject();

        // 🛡️ REPAIR: Hard End-Game Check
        // Logic: Deck is empty AND only 0 or 1 player has cards left.
        const activePlayers = room.gameInstance.getPlayers().filter((p: any) =>
            room.gameInstance.getPlayerHand(p).toObject().cards.length > 0
        );
        const isActuallyEnded = (room.gameInstance.stockCount === 0 && activePlayers.length <= 1) || engineState.state === 4;

        if (isActuallyEnded && !room.economyProcessed) {
            processGameOver(roomId, engineState);
        }

        room.players.forEach((pid: string) => {
            const socketId = room.socketLookup[pid];
            if (!socketId) return;

            const sanitizedState = JSON.parse(JSON.stringify(engineState));
            if (isActuallyEnded) sanitizedState.state = 4; // Force UI Modal

            sanitizedState.hands = {};
            room.gameInstance.getPlayers().forEach((p: any) => {
                const seatId = p.getId();
                const cards = room.gameInstance.getPlayerHand(p).toObject().cards;
                const isOwner = (room.playerMapping[pid] === seatId);
                sanitizedState.hands[seatId] = isOwner ? cards : cards.map(() => ({ hidden: true }));
            });

            io.to(socketId).emit('game_state_update', sanitizedState);
        });

        // 🛡️ AI KILL-SWITCH: Stop thinking if game is over
        if (isActuallyEnded) {
            if (room.botTimer) clearTimeout(room.botTimer);
            return;
        }

        // Trigger Bot Cycle
        if (room.settings.mode === 'single' && engineState.currentId !== 0) {
            if (room.botTimer) clearTimeout(room.botTimer);
            room.botTimer = setTimeout(() => {
                executeBotAI(room);
                broadcastGameState(roomId);
            }, 1000);
        }
    } catch (err: any) { console.error(`❌ [${roomId}] Stream Error`); }
};

/**
 * 💰 ECONOMY PROCESSING
 * Rewards winners and penalizes the Durak.
 */
const processGameOver = async (roomId: string, state: any) => {
    const room = activeRooms.get(roomId);
    if (!room || room.economyProcessed) return;
    room.economyProcessed = true;

    const stakes = room.settings.stakes || 1000;
    try {
        // Find the Durak (the one left with cards)
        if (state.players.length === 1) {
            const loserSeat = state.players[0].id;
            const loserPid = Object.keys(room.playerMapping).find(pid => room.playerMapping[pid] === loserSeat);
            if (loserPid) {
                await UserModel.updateOne({ userId: loserPid }, { $inc: { "balance": -stakes, "stats.losses": 1 } });
                const winners = room.players.filter((p: string) => p !== loserPid);
                for (const winId of winners) {
                    await UserModel.updateOne({ userId: winId }, { $inc: { "balance": stakes, "stats.wins": 1 } });
                }
            }
        }
    } catch (e) { console.error("💰 Economy Sync Failed"); }
};

// --- 🛰️ SOCKET GATEWAY ---
io.on('connection', (socket: Socket) => {
    const { profile } = socket.handshake.auth;
    if (!profile?.id) return;
    const userId = profile.id;
    const userName = profile.username;

    socket.on('request_sync', (roomId) => broadcastGameState(roomId));

    socket.on('create_room', (settings, callback) => {
        try {
            const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
            const newRoom = {
                id: roomId, hostId: userId, hostName: userName, settings,
                players: [userId],
                playerNames: { [userId]: userName },
                socketLookup: { [userId]: socket.id },
                playerMapping: { [userId]: 0 },
                gameInstance: new Game(),
                gameStarted: false,
                economyProcessed: false,
                botTimer: null as NodeJS.Timeout | null
            };

            if (settings.mode === 'single') {
                const p = [new Player(0, userName)];
                for (let i = 1; i < (settings.players || 2); i++) p.push(new Player(i, `Bot_${i}`));
                newRoom.gameInstance.init(p, settings);
                newRoom.gameStarted = true;
            }

            activeRooms.set(roomId, newRoom);
            socket.join(roomId);
            if (settings.mode === 'multi') io.emit('lobby_update');
            callback({ success: true, roomId });
            broadcastGameState(roomId);
        } catch (e) { callback({ success: false, error: "Init Fault" }); }
    });

    socket.on('join_room', (roomId, callback) => {
        const room = activeRooms.get(roomId);
        if (!room) return callback({ success: false, error: 'Expired' });

        if (!room.players.includes(userId)) {
            if (room.players.length >= room.settings.players) return callback({ success: false, error: 'Full' });
            room.players.push(userId);
            room.playerNames[userId] = userName;
            room.socketLookup[userId] = socket.id;
            room.playerMapping[userId] = room.players.length - 1;
            socket.join(roomId);
            io.emit('lobby_update');
        }

        callback({ success: true, settings: room.settings });

        if (room.players.length == room.settings.players && !room.gameStarted) {
            const p = room.players.map((id: string, i: number) => new Player(i, room.playerNames[id]));
            room.gameInstance.init(p, room.settings);
            room.gameStarted = true;
        }
        broadcastGameState(roomId);
    });

    // 🛡️ REMATCH LISTENER
    socket.on('play_again', (roomId) => {
        const room = activeRooms.get(roomId);
        if (!room || room.hostId !== userId) return;

        try {
            const p = room.players.map((id: string, i: number) => new Player(i, room.playerNames[id]));
            if (room.settings.mode === 'single') {
                for (let i = room.players.length; i < (room.settings.players || 2); i++) p.push(new Player(i, `Bot_${i}`));
            }

            room.gameInstance = new Game();
            room.gameInstance.init(p, room.settings);
            room.gameStarted = true;
            room.economyProcessed = false;

            broadcastGameState(roomId);
        } catch (e) { console.error("🚨 Rematch Initialization Failed"); }
    });

    socket.on('play_card', ({ roomId, card }) => {
        const room = activeRooms.get(roomId);
        if (!room || room.gameInstance.toObject().currentId !== room.playerMapping[userId]) return;
        if (room.gameInstance.act(new Card(card.suite, card.rank))) broadcastGameState(roomId);
    });

    socket.on('pass_or_take', ({ roomId }) => {
        const room = activeRooms.get(roomId);
        if (!room || room.gameInstance.toObject().currentId !== room.playerMapping[userId]) return;
        const s = room.gameInstance.toObject();
        s.currentId === s.defenderId ? room.gameInstance.take() : room.gameInstance.pass();
        broadcastGameState(roomId);
    });

    socket.on('disconnect', () => console.log(`[-] ${userName} Offline`));
});

httpServer.listen(PORT, () => console.log(`♠️ DURAK ELITE SERVER OPERATIONAL`));