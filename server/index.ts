import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';

// Engine & Model Imports
import { Game } from '../src/engine/Game';
import { Player } from '../src/engine/Player';
import { Card } from '../src/engine/Card';
import { UserModel } from './models/User';

// 1. CONFIGURATION: Load environment variables
dotenv.config({ path: './server/.env' });

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: { origin: "http://localhost:3000", methods: ["GET", "POST"] }
});

// 2. DATABASE: Secure Atlas Connection
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error("❌ ERROR: MONGODB_URI is missing in your .env file!");
    process.exit(1);
}

mongoose.connect(MONGODB_URI)
    .then(() => console.log("🌌 [ATLAS] Cloud Database Connected Successfully"))
    .catch(err => console.error("❌ [ATLAS] Connection Error:", err));

const activeRooms = new Map<string, any>();

// 3. SOCKET.IO LOGIC
io.on('connection', (socket) => {
    const profile = socket.handshake.auth.profile;
    const userId = profile?.id;
    const userName = profile?.username;

    if (!userId || !userName) return;

    console.log(`[+] Executive connected: ${userName}`);

    // --- IDENTITY & ECONOMY ---
    socket.on('sync_profile', async (callback) => {
        try {
            let user = await UserModel.findOne({ userId });
            if (!user) {
                user = await UserModel.create({ userId, username: userName });
                console.log(`[✨] New Account: ${userName}`);
            } else if (user.username !== userName) {
                user.username = userName;
                await user.save();
            }
            callback({
                success: true,
                balance: user.balance,
                wins: user.stats.wins,
                losses: user.stats.losses
            });
        } catch (error) {
            callback({ success: false });
        }
    });

    // --- GAMEPLAY ORCHESTRATION ---
    const broadcastGameState = (roomId: string) => {
        const room = activeRooms.get(roomId);
        if (!room || !room.gameInstance) return;

        try {
            const engineState = room.gameInstance.toObject();

            // End-game economic processing
            if (room.gameInstance.isEnded() && !room.economyProcessed) {
                processGameOver(roomId, engineState);
            }

            // Personalized Fog of War
            room.players.forEach((pid: string) => {
                const socketId = room.socketLookup[pid];
                if (!socketId) return;

                const sanitizedState = { ...engineState };
                sanitizedState.hands = {};

                room.gameInstance.getPlayers().forEach((p: any) => {
                    const realHand = room.gameInstance.getPlayerHand(p).toObject().cards;
                    const seatId = p.getId();
                    const isOwner = (seatId === 0 && pid === room.hostId) ||
                        (room.playerMapping[pid] === seatId);

                    sanitizedState.hands[seatId] = isOwner ? realHand : realHand.map(() => ({ hidden: true }));
                });

                io.to(socketId).emit('game_state_update', sanitizedState);
            });

            // Handle Bot Thinking Cycles
            if (room.botTimer) clearTimeout(room.botTimer);
            if (!room.gameInstance.isEnded() && room.settings.mode === 'single') {
                room.botTimer = setTimeout(() => processBotTurn(roomId), 1500);
            }
        } catch (err) {
            console.error(`❌ BROADCAST ERROR [Room ${roomId}]:`, err);
        }
    };

    const processBotTurn = (roomId: string) => {
        const room = activeRooms.get(roomId);
        if (!room || !room.gameInstance || room.gameInstance.isEnded()) return;

        const state = room.gameInstance.toObject();
        const currentId = state.currentId;

        if (room.settings.mode === 'single' && currentId !== 0) {
            const botPlayer = room.gameInstance.getPlayers().find((p: any) => p.getId() === currentId);
            if (!botPlayer) return;

            console.log(`[🤖] Bot_${currentId} is thinking...`);

            // Efficiency: Sort by rank to play the lowest cards first
            const cardsInHand = room.gameInstance.getPlayerHand(botPlayer).toObject().cards;
            const sortedCards = [...cardsInHand].sort((a, b) => a.rank - b.rank);

            let moveMade = false;
            for (const c of sortedCards) {
                const cardObj = new Card(c.suite, c.rank);
                if (room.gameInstance.act(cardObj)) {
                    console.log(`[🤖] Bot_${currentId} played: ${c.rank} of ${c.suite}`);
                    moveMade = true;
                    break;
                }
            }

            if (!moveMade) {
                if (currentId === state.defenderId) {
                    console.log(`[🤖] Bot_${currentId} takes cards.`);
                    room.gameInstance.take();
                } else {
                    console.log(`[🤖] Bot_${currentId} passes.`);
                    room.gameInstance.pass();
                }
            }
            broadcastGameState(roomId);
        }
    };

    const processGameOver = async (roomId: string, state: any) => {
        const room = activeRooms.get(roomId);
        room.economyProcessed = true;
        const stakes = room.settings.stakes || 1000;

        if (state.players.length === 1) {
            const loserEngineId = state.players[0].id;
            const loserPid = Object.keys(room.playerMapping).find(pid => room.playerMapping[pid] === loserEngineId);

            if (loserPid) {
                await UserModel.updateOne({ userId: loserPid }, { $inc: { "balance": -stakes, "stats.losses": 1, "stats.gamesPlayed": 1 } });
                const winners = room.players.filter((pid: string) => pid !== loserPid);
                for (const winPid of winners) {
                    await UserModel.updateOne({ userId: winPid }, { $inc: { "balance": stakes, "stats.wins": 1, "stats.gamesPlayed": 1 } });
                }
            }
            console.log(`[💰] Stakes of $${stakes} processed for room: ${roomId}`);
        }
    };

    // --- NETWORK ACTIONS ---
    socket.on('create_room', (settings, callback) => {
        try {
            console.log(`[🛠] Creating Room for ${userName}...`);
            const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();

            const newRoom = {
                id: roomId, hostId: userId, hostName: userName, settings,
                players: [userId], socketLookup: { [userId]: socket.id },
                playerMapping: { [userId]: 0 }, gameInstance: null as Game | null,
                economyProcessed: false, botTimer: null as any
            };

            activeRooms.set(roomId, newRoom);
            socket.join(roomId);

            if (settings.mode === 'single') {
                const enginePlayers = [new Player(0, userName)];
                for (let i = 1; i < settings.players; i++) {
                    enginePlayers.push(new Player(i, `Bot_${i}`));
                }
                newRoom.gameInstance = new Game();
                newRoom.gameInstance.init(enginePlayers, settings);
                console.log(`[✅] Match Initialized with ${settings.players} seats.`);
            }

            callback({ success: true, roomId });
            if (settings.mode === 'single') broadcastGameState(roomId);
        } catch (err) {
            console.error("❌ CREATE_ROOM FAILED:", err);
            callback({ success: false, error: "Initialization error." });
        }
    });

    socket.on('join_room', (roomId, callback) => {
        const room = activeRooms.get(roomId);
        if (!room) return callback({ success: false, error: 'Match Expired.' });

        if (!room.players.includes(userId)) {
            if (room.players.length >= room.settings.players) return callback({ success: false, error: 'Full.' });
            const engineIdx = room.players.length;
            room.players.push(userId);
            room.socketLookup[userId] = socket.id;
            room.playerMapping[userId] = engineIdx;
            socket.join(roomId);
        }

        callback({ success: true, settings: room.settings });
        if (room.players.length === room.settings.players && !room.gameInstance) {
            const enginePlayers = room.players.map((pid: string) =>
                new Player(room.playerMapping[pid], pid === room.hostId ? room.hostName : `Player_${room.playerMapping[pid]}`)
            );
            room.gameInstance = new Game();
            room.gameInstance.init(enginePlayers, room.settings);
            broadcastGameState(roomId);
        }
    });

    socket.on('play_card', ({ roomId, card }) => {
        const room = activeRooms.get(roomId);
        const playerIdx = room?.playerMapping[userId];
        if (room?.gameInstance && playerIdx === room.gameInstance.toObject().currentId) {
            room.gameInstance.act(new Card(card.suite, card.rank));
            broadcastGameState(roomId);
        }
    });

    socket.on('pass_or_take', ({ roomId }) => {
        const room = activeRooms.get(roomId);
        const playerIdx = room?.playerMapping[userId];
        if (room?.gameInstance && playerIdx === room.gameInstance.toObject().currentId) {
            const state = room.gameInstance.toObject();
            state.currentId === state.defenderId ? room.gameInstance.take() : room.gameInstance.pass();
            broadcastGameState(roomId);
        }
    });

    socket.on('send_emoji', ({ roomId, emoji }) => {
        const room = activeRooms.get(roomId);
        if (room) {
            const senderEngineId = room.playerMapping[userId];
            io.to(roomId).emit('new_emoji', { userId: senderEngineId, emoji });
        }
    });

    socket.on('get_leaderboard', async (callback) => {
        try {
            const topPlayers = await UserModel.find({}).sort({ balance: -1 }).limit(10).select('username balance stats -_id');
            callback({ success: true, leaderboard: topPlayers });
        } catch (error) { callback({ success: false }); }
    });

    socket.on('check_session', (callback) => {
        for (const [roomId, room] of activeRooms.entries()) {
            if (room.players.includes(userId)) {
                socket.join(roomId);
                room.socketLookup[userId] = socket.id;
                callback({ inGame: true, settings: room.settings, roomId });
                if (room.gameInstance) broadcastGameState(roomId);
                return;
            }
        }
        callback({ inGame: false });
    });

    socket.on('disconnect', () => {
        console.log(`[-] Disconnected: ${userName}`);
    });
});

const PORT = process.env.PORT || 3002;
httpServer.listen(PORT, () => {
    console.log(`\n======================================`);
    console.log(`♠️  DURAK ELITE SERVER: PERSISTENT   ♠️`);
    console.log(`======================================\n`);
});