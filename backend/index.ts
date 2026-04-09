import { GameServer } from './Server';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

// Initialize and start the server
const server = new GameServer(PORT);
