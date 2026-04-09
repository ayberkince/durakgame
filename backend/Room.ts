import { Player, RoomSettings } from './types';

export class Room {
  public roomId: string;
  public hostId: string;
  public players: Player[];
  public settings: RoomSettings;

  constructor(roomId: string, host: Player, settings: RoomSettings) {
    this.roomId = roomId;
    this.hostId = host.id;
    this.players = [host];
    this.settings = settings;
  }

  public addPlayer(player: Player): boolean {
    if (this.players.length >= this.settings.maxPlayers) return false;
    if (this.players.find(p => p.id === player.id)) return false;
    
    this.players.push(player);
    return true;
  }

  public removePlayer(playerId: string): void {
    this.players = this.players.filter(p => p.id !== playerId);
  }

  public isEmpty(): boolean {
    return this.players.length === 0;
  }

  public toJSON() {
    return {
      id: this.roomId,
      hostId: this.hostId,
      players: this.players,
      currentPlayers: this.players.length,
      settings: this.settings
    };
  }
}
