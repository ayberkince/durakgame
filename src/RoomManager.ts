import { Game, GameSettings } from './engine/Game';
import { Player } from './engine/Player';
import { ROOM_ID_LENGTH } from './engine/config';

// --- THE ROOM (A single game lobby) ---
export class Room {
    public id: string;
    public game: Game;
    public settings: GameSettings;
    public maxPlayers: number;
    public hostSocketId: string;

    // Maps a socket.id to our pure Engine Player object
    public players: Map<string, Player> = new Map();

    constructor(id: string, hostSocketId: string, settings: GameSettings, maxPlayers: number) {
        this.id = id;
        this.hostSocketId = hostSocketId;
        this.settings = settings;
        this.maxPlayers = maxPlayers;
        this.game = new Game(); // 🧠 Here is the brain we built!
    }

    addPlayer(socketId: string, playerName: string): boolean {
        if (this.players.size >= this.maxPlayers) return false;

        // Assign a simple numeric ID based on join order (0, 1, 2...)
        const numericId = this.players.size;
        const newPlayer = new Player(numericId, playerName);

        // If they are the host, update their role
        if (socketId === this.hostSocketId) newPlayer.makeHost();

        this.players.set(socketId, newPlayer);
        return true;
    }

    removePlayer(socketId: string): void {
        this.players.delete(socketId);
    }

    // Returns safe data to show in the UI lobby
    getLobbyData() {
        return {
            id: this.id,
            playerCount: this.players.size,
            maxPlayers: this.maxPlayers,
            settings: this.settings,
        };
    }
}

// --- THE MANAGER (The Casino Boss) ---
export class RoomManager {
    private rooms: Map<string, Room> = new Map();

    createRoom(hostSocketId: string, settings: GameSettings, maxPlayers: number): Room {
        const roomId = this.generateRoomId();
        const newRoom = new Room(roomId, hostSocketId, settings, maxPlayers);
        this.rooms.set(roomId, newRoom);
        return newRoom;
    }

    getRoom(roomId: string): Room | undefined {
        return this.rooms.get(roomId);
    }

    removeRoom(roomId: string): void {
        this.rooms.delete(roomId);
    }

    getAllRoomsData() {
        // Converts our Map into an array of simple objects for the React Native UI
        return Array.from(this.rooms.values()).map(room => room.getLobbyData());
    }

    private generateRoomId(): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let id;
        do {
            id = '';
            for (let i = 0; i < ROOM_ID_LENGTH; i++) {
                id += chars.charAt(Math.floor(Math.random() * chars.length));
            }
        } while (this.rooms.has(id)); // Ensure it is unique
        return id;
    }
}