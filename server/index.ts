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

// Replace: dotenv.config();
// With this:
dotenv.config({ path: './server/.env' });

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: { origin: "http://localhost:3000", methods: ["GET", "POST"] }
});

// 2. DATABASE: Single Secure Connection
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

    // --- ECONOMY & IDENTITY ---
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

    // --- GAMEPLAY UTILITIES ---
    const broadcastGameState = (roomId: string) => {
        const room = activeRooms.get(roomId);
        if (!room || !room.gameInstance) return;

        const engineState = room.gameInstance.toObject();

        // Check if match just ended
        if (room.gameInstance.isEnded() && !room.economyProcessed) {
            processGameOver(roomId, engineState);
        }

        // Send personalized (sanitized) states to each player
        room.players.forEach((pid: string) => {
            const socketId = room.socketLookup[pid];
            if (!socketId) return;

            const sanitizedState = { ...engineState };
            sanitizedState.hands = {};

            room.gameInstance.getPlayers().forEach((p: any) => {
                const realHand = room.gameInstance.getPlayerHand(p).toObject().cards;
                const isOwner = (p.getId() === 0 && pid === room.hostId) ||
                    (room.playerMapping && room.playerMapping[pid] === p.getId());

                sanitizedState.hands[p.getId()] = isOwner ? realHand : realHand.map(() => ({ hidden: true }));
            });

            io.to(socketId).emit('game_state_update', sanitizedState);
        });

        setTimeout(() => processBotTurn(roomId), 1000);
    };

    const processGameOver = async (roomId: string, state: any) => {
        const room = activeRooms.get(roomId);
        room.economyProcessed = true;
        const stakes = 1000;

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
            console.log(`[💰] Stakes processed for room: ${roomId}`);
        }
    };

    const processBotTurn = (roomId: string) => {
        const room = activeRooms.get(roomId);
        if (!room || !room.gameInstance || room.gameInstance.isEnded()) return;

        const state = room.gameInstance.toObject();
        if (room.settings.mode === 'single' && state.currentId > 0) {
            const botPlayer = room.gameInstance.getPlayers().find((p: any) => p.getId() === state.currentId);
            if (!botPlayer) return;

            const botHand = room.gameInstance.getPlayerHand(botPlayer).toObject().cards.map((c: any) => new Card(c.suite, c.rank));
            botHand.sort((a: any, b: any) => a.getRank() - b.getRank());

            let moveMade = false;
            for (const card of botHand) {
                if (room.gameInstance.act(card)) { moveMade = true; break; }
            }
            if (!moveMade) {
                state.currentId === state.defenderId ? room.gameInstance.take() : room.gameInstance.pass();
            }
            broadcastGameState(roomId);
        }
    };

    // --- PLAYER ACTIONS ---
    socket.on('create_room', (settings, callback) => {
        const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
        const newRoom = {
            id: roomId, hostId: userId, hostName: userName, settings,
            players: [userId], socketLookup: { [userId]: socket.id },
            playerMapping: { [userId]: 0 }, gameInstance: null as Game | null, economyProcessed: false
        };

        activeRooms.set(roomId, newRoom);
        socket.join(roomId);

        if (settings.mode === 'single') {
            const enginePlayers = [new Player(0, userName)];
            for (let i = 1; i < settings.players; i++) enginePlayers.push(new Player(i, `Bot_${i}`));
            newRoom.gameInstance = new Game();
            newRoom.gameInstance.init(enginePlayers, settings);
        }

        callback({ success: true, roomId });
        if (settings.mode === 'single') broadcastGameState(roomId);
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
            const enginePlayers = room.players.map((pid: string) => new Player(room.playerMapping[pid], pid === room.hostId ? room.hostName : `Player_${room.playerMapping[pid]}`));
            room.gameInstance = new Game();
            room.gameInstance.init(enginePlayers, room.settings);
            broadcastGameState(roomId);
        }
    });

    socket.on('play_card', ({ roomId, card }) => {
        const room = activeRooms.get(roomId);
        if (room?.gameInstance && room.playerMapping[userId] === room.gameInstance.toObject().currentId) {
            room.gameInstance.act(new Card(card.suite, card.rank));
            broadcastGameState(roomId);
        }
    });

    socket.on('pass_or_take', ({ roomId }) => {
        const room = activeRooms.get(roomId);
        if (room?.gameInstance && room.playerMapping[userId] === room.gameInstance.toObject().currentId) {
            const state = room.gameInstance.toObject();
            state.currentId === state.defenderId ? room.gameInstance.take() : room.gameInstance.pass();
            broadcastGameState(roomId);
        }
    });

    socket.on('get_leaderboard', async (callback) => {
        try {
            const topPlayers = await UserModel.find({}).sort({ balance: -1 }).limit(10).select('username balance stats -_id');
            callback({ success: true, leaderboard: topPlayers });
        } catch (error) { callback({ success: false }); }
    });

    socket.on('send_emoji', ({ roomId, emoji }) => {
        const room = activeRooms.get(roomId);
        if (room) {
            const senderEngineId = room.playerMapping[userId];
            io.to(roomId).emit('new_emoji', { userId: senderEngineId, emoji });
        }
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

    socket.on('disconnect', () => { console.log(`[-] Disconnected: ${userName}`); });
});

const PORT = process.env.PORT || 3002;
httpServer.listen(PORT, () => {
    console.log(`\n======================================`);
    console.log(`♠️  DURAK ELITE SERVER: PERSISTENT   ♠️`);
    console.log(`======================================\n`);
});