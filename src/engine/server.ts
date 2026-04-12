import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import { RoomManager } from '../RoomManager';

const app = express();
app.use(cors());
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

// Initialize our Casino Boss
const roomManager = new RoomManager();

console.log("♠️ ♥️ Durak Multiplayer Server is starting... ♦️ ♣️");

io.on('connection', (socket: Socket) => {
  console.log(`[+] Player connected: ${socket.id}`);

  // Send the active rooms to the newly connected player
  socket.emit('lobby_update', roomManager.getAllRoomsData());

  socket.on('create_room', (payload) => {
    // payload should contain { settings: { isPerevodnoy, deckSize }, maxPlayers, playerName }
    const { settings, maxPlayers, playerName } = payload;

    // 1. Create the room
    const room = roomManager.createRoom(socket.id, settings, maxPlayers);

    // 2. Add the host to the room
    room.addPlayer(socket.id, playerName);

    // 3. Put the socket in a specific Socket.io channel
    socket.join(room.id);

    console.log(`Room ${room.id} created by ${socket.id}`);

    // 4. Send the player into the room on their app
    socket.emit('room_joined', { roomId: room.id, players: Array.from(room.players.values()) });

    // 5. Tell EVERYONE else in the main menu that a new room exists
    io.emit('lobby_update', roomManager.getAllRoomsData());
  });

  socket.on('disconnect', () => {
    console.log(`[-] Player disconnected: ${socket.id}`);
    // TODO: Handle removing the player from their room if they disconnect
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});