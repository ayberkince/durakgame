import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());

const httpServer = createServer(app);

// Initialize Socket.io with strict CORS policies for our Next.js frontend
const io = new Server(httpServer, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

// Our In-Memory Database for Active VIP Rooms
const activeRooms = new Map<string, any>();

io.on('connection', (socket) => {
    console.log(`[+] Executive connected: ${socket.id}`);

    // When a player asks for the lobby list, send them all active rooms
    socket.on('request_lobby_data', () => {
        const roomsList = Array.from(activeRooms.values()).map(room => ({
            id: room.id,
            host: room.hostName,
            stakes: room.stakes,
            players: room.players.length,
            max: room.maxPlayers,
            type: room.isPerevodnoy ? 'Transfer' : 'Throw-in'
        }));
        socket.emit('lobby_update', roomsList);
    });

    // Handle a player disconnecting
    socket.on('disconnect', () => {
        console.log(`[-] Executive disconnected: ${socket.id}`);
        // TODO: Later, we will add logic to handle a player dropping mid-game
    });
});

const PORT = 3001;
httpServer.listen(PORT, () => {
    console.log(`\n======================================`);
    console.log(`♠️  DURAK MULTIPLAYER SERVER ONLINE ♠️`);
    console.log(`🌐 Listening on port: ${PORT}`);
    console.log(`======================================\n`);
});