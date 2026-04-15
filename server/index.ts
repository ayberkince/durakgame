import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';

// Engine & Model Imports
import { Game } from '../src/engine/Game';
import { Player } from '../src/engine/Player';
import { Card } from '../src/engine/Card';
import { UserModel } from './models/User'; // Ensure this path matches your project

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: { origin: "http://localhost:3000", methods: ["GET", "POST"] }
});

// 1. DATABASE CONNECTION
// Replace 'durak_elite' with your database name
mongoose.connect('mongodb://127.0.0.1:27017/durak_elite')
    .then(() => console.log("📦 [DATABASE] Connected to MongoDB"))
    .catch(err => console.error("❌ [DATABASE] Connection Error:", err));

const activeRooms = new Map<string, any>();

io.on('connection', (socket) => {
    const profile = socket.handshake.auth.profile;
    const userId = profile?.id;
    const userName = profile?.username;

    if (!userId || !userName) {
        console.log(`[!] Anonymous connection rejected: ${socket.id}`);
        return;
    }

    console.log(`[+] Executive connected: ${userName} (${userId})`);

    // 2. ECONOMY: SYNC PROFILE WITH DATABASE
    socket.on('sync_profile', async (callback) => {
        try {
            let user = await UserModel.findOne({ userId });
            if (!user) {
                user = await UserModel.create({ userId, username: userName });
                console.log(`[✨] New Account Created: ${userName}`);
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

    const broadcastLobby = () => {
        const roomsList = Array.from(activeRooms.values())
            .filter(room => room.settings.mode === 'multi')
            .map(room => ({
                id: room.id,
                host: room.hostName,
                players: room.players.length,
                max: room.settings.players,
                type: room.settings.isPerevodnoy ? 'Transfer' : 'Standard'
            }));
        io.emit('lobby_update', roomsList);
    };

    const broadcastGameState = (roomId: string) => {
        const room = activeRooms.get(roomId);
        if (!room || !room.gameInstance) return;

        const engineState = room.gameInstance.toObject();

        // CHECK FOR GAME OVER (Economy Update)
        if (room.gameInstance.isEnded() && !room.economyProcessed) {
            processGameOver(roomId, engineState);
        }

        room.players.forEach((pid: string) => {
            const socketId = room.socketLookup[pid];
            if (!socketId) return;

            const sanitizedState = { ...engineState };
            sanitizedState.hands = {};

            room.gameInstance.getPlayers().forEach((p: any) => {
                const realHand = room.gameInstance.getPlayerHand(p).toObject().cards;
                const isOwner = (p.getId() === 0 && pid === room.hostId) ||
                    (room.playerMapping && room.playerMapping[pid] === p.getId());

                if (isOwner) {
                    sanitizedState.hands[p.getId()] = realHand;
                } else {
                    sanitizedState.hands[p.getId()] = realHand.map(() => ({ hidden: true }));
                }
            });

            io.to(socketId).emit('game_state_update', sanitizedState);
        });

        setTimeout(() => processBotTurn(roomId), 1000);
    };

    // 3. PERSISTENCE: PROCESS END-GAME STATS
    const processGameOver = async (roomId: string, state: any) => {
        const room = activeRooms.get(roomId);
        room.economyProcessed = true; // Prevents double-counting

        const stakes = 1000; // Hardcoded stake for Phase 3
        console.log(`[💰] Match Ended in room ${roomId}. Processing stakes...`);

        // If there's 1 player left, they are the Durak (Loser)
        if (state.players.length === 1) {
            const loserEngineId = state.players[0].id;

            // Deduct from Loser
            const loserPid = Object.keys(room.playerMapping).find(pid => room.playerMapping[pid] === loserEngineId);
            if (loserPid) {
                await UserModel.updateOne({ userId: loserPid },
                    { $inc: { "balance": -stakes, "stats.losses": 1, "stats.gamesPlayed": 1 } });
            }

            // Pay Winners
            const winners = room.players.filter((pid: string) => pid !== loserPid);
            for (const winPid of winners) {
                await UserModel.updateOne({ userId: winPid },
                    { $inc: { "balance": stakes, "stats.wins": 1, "stats.gamesPlayed": 1 } });
            }
        }
    };

    const processBotTurn = (roomId: string) => {
        const room = activeRooms.get(roomId);
        if (!room || !room.gameInstance || room.gameInstance.isEnded()) return;

        const state = room.gameInstance.toObject();
        const currentId = state.currentId;

        if (room.settings.mode === 'single' && currentId > 0) {
            const botPlayer = room.gameInstance.getPlayers().find((p: any) => p.getId() === currentId);
            if (!botPlayer) return;

            const botHandRaw = room.gameInstance.getPlayerHand(botPlayer).toObject().cards;
            const botHand = botHandRaw.map((c: any) => new Card(c.suite, c.rank));

            botHand.sort((a: any, b: any) => a.getRank() - b.getRank());
            let moveMade = false;

            for (const card of botHand) {
                if (room.gameInstance.act(card)) {
                    moveMade = true;
                    break;
                }
            }

            if (!moveMade) {
                currentId === state.defenderId ? room.gameInstance.take() : room.gameInstance.pass();
            }
            broadcastGameState(roomId);
        }
    };

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

    socket.on('create_room', (settings, callback) => {
        const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
        const newRoom = {
            id: roomId,
            hostId: userId,
            hostName: userName,
            settings: settings,
            players: [userId],
            socketLookup: { [userId]: socket.id },
            playerMapping: { [userId]: 0 },
            gameInstance: null as Game | null,
            economyProcessed: false
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
        broadcastLobby();
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
            if (!room.playerMapping) room.playerMapping = {};
            room.playerMapping[userId] = engineIdx;
            socket.join(roomId);
        }

        callback({ success: true, settings: room.settings });
        broadcastLobby();

        if (room.players.length === room.settings.players && !room.gameInstance) {
            const enginePlayers = room.players.map((pid: string) => {
                const idx = room.playerMapping[pid];
                const isHost = pid === room.hostId;
                return new Player(idx, isHost ? room.hostName : `Guest_${pid.substring(0, 4)}`);
            });
            room.gameInstance = new Game();
            room.gameInstance.init(enginePlayers, room.settings);
            broadcastGameState(roomId);
        }
    });

    socket.on('play_card', ({ roomId, card }) => {
        const room = activeRooms.get(roomId);
        if (!room || !room.gameInstance) return;

        const state = room.gameInstance.toObject();
        const playerIdx = room.playerMapping[userId];

        if (state.currentId !== playerIdx) return;

        const enginePlayer = room.gameInstance.getPlayers().find((p: any) => p.getId() === playerIdx);
        const cardObj = new Card(card.suite, card.rank);
        if (!room.gameInstance.getPlayerHand(enginePlayer).has(cardObj)) return;

        room.gameInstance.act(cardObj);
        broadcastGameState(roomId);
    });

    socket.on('pass_or_take', ({ roomId }) => {
        const room = activeRooms.get(roomId);
        if (!room || !room.gameInstance) return;
        const playerIdx = room.playerMapping[userId];
        const state = room.gameInstance.toObject();

        if (state.currentId !== playerIdx) return;

        state.currentId === state.defenderId ? room.gameInstance.take() : room.gameInstance.pass();
        broadcastGameState(roomId);
    });

    socket.on('disconnect', () => {
        console.log(`[-] Disconnected: ${userName}`);
    });
});

const PORT = 3002;
httpServer.listen(PORT, () => {
    console.log(`\n======================================`);
    console.log(`♠️  DURAK ELITE SERVER: PERSISTENT   ♠️`);
    console.log(`======================================\n`);
});