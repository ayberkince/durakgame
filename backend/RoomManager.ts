import { Server as SocketIOServer } from 'socket.io';
import { Room } from './Room';
import { Player, RoomSettings } from './types';

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private io: SocketIOServer;

  constructor(io: SocketIOServer) {
    this.io = io;
  }

  public createRoom(host: Player, settings: RoomSettings): Room {
    // Generate a simple 6-character alphanumeric room ID
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const room = new Room(roomId, host, settings);
    
    this.rooms.set(roomId, room);
    this.broadcastLobbyUpdate();
    
    return room;
  }

  public joinRoom(roomId: string, player: Player): Room | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const success = room.addPlayer(player);
    if (success) {
      this.broadcastLobbyUpdate();
      return room;
    }
    
    return null; // Room is full or player already in room
  }

  public leaveRoom(roomId: string, playerId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.removePlayer(playerId);
      
      if (room.isEmpty()) {
        // Destroy room if empty
        this.rooms.delete(roomId);
      } else if (room.hostId === playerId) {
        // Reassign host if the current host leaves
        room.hostId = room.players[0].id;
      }
      
      this.broadcastLobbyUpdate();
    }
  }

  public handleDisconnect(playerId: string): void {
    // Find all rooms the player is in and remove them
    for (const [roomId, room] of this.rooms.entries()) {
      if (room.players.some(p => p.id === playerId)) {
        this.leaveRoom(roomId, playerId);
      }
    }
  }

  public getAllRooms() {
    // Return serialized room data for the lobby
    return Array.from(this.rooms.values()).map(room => room.toJSON());
  }

  private broadcastLobbyUpdate() {
    // Broadcast the updated room list to all clients sitting in the 'lobby'
    this.io.to('lobby').emit('lobby_update', this.getAllRooms());
  }
}
