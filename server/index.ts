import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

// Engine Imports
import { Game } from '../src/engine/Game';
import { Player } from '../src/engine/Player';
import { Card } from '../src/engine/Card';

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: { origin: "http://localhost:3000", methods: ["GET", "POST"] }
});

// The Master Database of Active Rooms
// Each room will now track players by their Persistent User ID
const activeRooms = new Map<string, any>();

io.on('connection', (socket) => {
    // 1. IDENTITY HANDSHAKE
    // We extract the persistent profile sent from the frontend identity.ts
    const profile = socket.handshake.auth.profile;
    const userId = profile?.id;
    const userName = profile?.username;

    // Guard: If no profile, we can't track them. (In production, you'd force a redirect)
    if (!userId || !userName) {
        console.log(`[!] Anonymous connection rejected: ${socket.id}`);
        return;
    }

    console.log(`[+] Executive connected: ${userName} (${userId})`);

    // 2. UTILITY: LOBBY BROADCASTER
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

    // 3. UTILITY: SECURE STATE BROADCASTER (FOG OF WAR)
    const broadcastGameState = (roomId: string) => {
        const room = activeRooms.get(roomId);
        if (!room || !room.gameInstance) return;

        const engineState = room.gameInstance.toObject();

        // We broadcast a custom, censored version of the state to every socket in the room
        room.players.forEach((pid: string) => {
            const socketId = room.socketLookup[pid];
            if (!socketId) return;

            const sanitizedState = { ...engineState };
            sanitizedState.hands = {};

            room.gameInstance.getPlayers().forEach((p: any) => {
                const realHand = room.gameInstance.getPlayerHand(p).toObject().cards;

                // Logic: If the hand belongs to THIS specific user, send real cards. 
                // Otherwise, send "hidden" placeholders.
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

        // Trigger Bot Check
        setTimeout(() => processBotTurn(roomId), 1000);
    };

    // 4. UTILITY: SERVER-SIDE AI
    const processBotTurn = (roomId: string) => {
        const room = activeRooms.get(roomId);
        if (!room || !room.gameInstance || room.gameInstance.isEnded()) return;

        const state = room.gameInstance.toObject();
        const currentId = state.currentId;

        // In Single Player, currentId > 0 means it's a bot's turn
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

    // 5. SESSION RECOVERY
    socket.on('check_session', (callback) => {
        for (const [roomId, room] of activeRooms.entries()) {
            if (room.players.includes(userId)) {
                socket.join(roomId);
                room.socketLookup[userId] = socket.id; // Map the new socket wire to the old User ID
                callback({ inGame: true, settings: room.settings, roomId });
                if (room.gameInstance) broadcastGameState(roomId);
                return;
            }
        }
        callback({ inGame: false });
    });

    // 6. ROOM ACTIONS
    socket.on('create_room', (settings, callback) => {
        const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
        const newRoom = {
            id: roomId,
            hostId: userId,
            hostName: userName,
            settings: settings,
            players: [userId],
            socketLookup: { [userId]: socket.id },
            playerMapping: { [userId]: 0 }, // Map this User ID to Engine Player 0
            gameInstance: null as Game | null
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
            room.playerMapping[userId] = engineIdx; // Map this unique User ID to an engine seat
            socket.join(roomId);
        }

        callback({ success: true, settings: room.settings });
        broadcastLobby();

        if (room.players.length === room.settings.players && !room.gameInstance) {
            const enginePlayers = room.players.map((pid: string) => {
                const idx = room.playerMapping[pid];
                // In multiplayer, we use the actual name chosen by the user!
                const isHost = pid === room.hostId;
                return new Player(idx, isHost ? room.hostName : `Guest_${pid.substring(0, 4)}`);
            });
            room.gameInstance = new Game();
            room.gameInstance.init(enginePlayers, room.settings);
            broadcastGameState(roomId);
        }
    });

    // 7. GAMEPLAY
    socket.on('play_card', ({ roomId, card }) => {
        const room = activeRooms.get(roomId);
        if (room?.gameInstance) {
            // Anti-Cheat: You can add a check here to ensure playerMapping[userId] === currentId
            room.gameInstance.act(new Card(card.suite, card.rank));
            broadcastGameState(roomId);
        }
    });

    socket.on('pass_or_take', ({ roomId }) => {
        const room = activeRooms.get(roomId);
        if (room?.gameInstance) {
            const state = room.gameInstance.toObject();
            state.currentId === state.defenderId ? room.gameInstance.take() : room.gameInstance.pass();
            broadcastGameState(roomId);
        }
    });

    socket.on('disconnect', () => {
        console.log(`[-] Disconnected: ${userName}`);
    });
});

const PORT = 3002;
httpServer.listen(PORT, () => {
    console.log(`\n======================================`);
    console.log(`♠️  DURAK ELITE SERVER: ONLINE        ♠️`);
    console.log(`======================================\n`);
});