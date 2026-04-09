import express from 'express';
import http from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { RoomManager } from './RoomManager';
import { Player, RoomSettings } from './types';

export class GameServer {
  private app: express.Application;
  private server: http.Server;
  private io: SocketIOServer;
  private roomManager: RoomManager;

  constructor(port: number) {
    this.app = express();
    this.server = http.createServer(this.app);
    
    // Initialize Socket.io with CORS
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: '*', // Configure appropriately for production
        methods: ['GET', 'POST']
      }
    });
    
    this.roomManager = new RoomManager(this.io);
    
    this.setupRoutes();
    this.setupSocketHandlers();

    this.server.listen(port, () => {
      console.log(`Game Server running on port ${port}`);
    });
  }

  private setupRoutes() {
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        activeRooms: this.roomManager.getAllRooms().length 
      });
    });
  }

  private setupSocketHandlers() {
    this.io.on('connection', (socket: Socket) => {
      console.log(`Client connected: ${socket.id}`);

      // 1. Join lobby by default to receive real-time room updates
      socket.join('lobby');
      socket.emit('lobby_update', this.roomManager.getAllRooms());

      // 2. Create Room
      socket.on('create_room', (data: { player: Omit<Player, 'id'>, settings: RoomSettings }, callback) => {
        const player: Player = { id: socket.id, ...data.player };
        const room = this.roomManager.createRoom(player, data.settings);
        
        // Host joins their own room channel
        socket.join(room.roomId);
        
        // Acknowledge success back to the client
        if (callback) callback({ success: true, room: room.toJSON() });
      });

      // 3. Join Room
      socket.on('join_room', (data: { roomId: string, player: Omit<Player, 'id'> }, callback) => {
        const player: Player = { id: socket.id, ...data.player };
        const room = this.roomManager.joinRoom(data.roomId, player);
        
        if (room) {
          socket.join(room.roomId);
          // Notify other players in the room that someone joined
          socket.to(room.roomId).emit('player_joined', { player, room: room.toJSON() });
          
          if (callback) callback({ success: true, room: room.toJSON() });
        } else {
          if (callback) callback({ success: false, message: 'Room full or not found' });
        }
      });

      // 4. Leave Room
      socket.on('leave_room', (data: { roomId: string }) => {
        this.roomManager.leaveRoom(data.roomId, socket.id);
        socket.leave(data.roomId);
        
        // Notify remaining players
        socket.to(data.roomId).emit('player_left', { playerId: socket.id });
      });

      // 5. Disconnect
      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        this.roomManager.handleDisconnect(socket.id);
      });
    });
  }
}
