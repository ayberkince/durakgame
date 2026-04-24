import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';

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

const broadcastGameState = (roomId: string) => {
    const room = activeRooms.get(roomId);
    if (!room) return;

    // 🛡️ THE FIX: Use the explicit gameStarted flag
    // This prevents Single Player from ever seeing the "Waiting" screen.
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
        room.players.forEach((pid: string) => {
            const socketId = room.socketLookup[pid];
            if (!socketId) return;

            const sanitizedState = JSON.parse(JSON.stringify(engineState));
            sanitizedState.hands = {};

            room.gameInstance.getPlayers().forEach((p: any) => {
                const seatId = p.getId();
                const cards = room.gameInstance.getPlayerHand(p).toObject().cards;
                const isOwner = (room.playerMapping[pid] === seatId);
                sanitizedState.hands[seatId] = isOwner ? cards : cards.map(() => ({ hidden: true }));
            });

            io.to(socketId).emit('game_state_update', sanitizedState);
        });

        // 🤖 BOT LOGIC (Only for single player)
        if (room.settings.mode === 'single' && engineState.currentId !== 0 && !room.gameInstance.isEnded()) {
            if (room.botTimer) clearTimeout(room.botTimer);
            room.botTimer = setTimeout(() => {
                const botPlayer = room.gameInstance.getPlayers().find((p: any) => p.getId() === engineState.currentId);
                if (botPlayer) {
                    const hand = room.gameInstance.getPlayerHand(botPlayer).toObject().cards;
                    const sorted = [...hand].sort((a, b) => a.rank - b.rank);
                    let moved = false;
                    for (const c of sorted) {
                        if (room.gameInstance.act(new Card(c.suite, c.rank))) { moved = true; break; }
                    }
                    if (!moved) engineState.currentId === engineState.defenderId ? room.gameInstance.take() : room.gameInstance.pass();
                    broadcastGameState(roomId);
                }
            }, 1000);
        }
    } catch (err: any) { console.error(`❌ [${roomId}] Stream Error`); }
};

// --- 🛰️ SOCKET GATEWAY ---
io.on('connection', (socket: Socket) => {
    const { profile } = socket.handshake.auth;
    if (!profile?.id) return;
    const userId = profile.id;
    const userName = profile.username;

    // 🛡️ RESYNC HANDSHAKE
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
                gameStarted: false, // 👈 KEY COMPONENT
                economyProcessed: false
            };

            if (settings.mode === 'single') {
                const p = [new Player(0, userName)];
                for (let i = 1; i < (settings.players || 2); i++) p.push(new Player(i, `Bot_${i}`));
                newRoom.gameInstance.init(p, settings);
                newRoom.gameStarted = true; // 👈 Starts instantly
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

        // 🛡️ MULTIPLAYER HARD-START
        if (room.players.length == room.settings.players && !room.gameStarted) {
            const p = room.players.map((id: string, i: number) => new Player(i, room.playerNames[id]));
            room.gameInstance.init(p, room.settings);
            room.gameStarted = true; // 👈 Flips the board from "Waiting" to "Active"
        }
        broadcastGameState(roomId);
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