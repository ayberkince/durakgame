import { io } from 'socket.io-client';

// Connect to our new backend running on port 3001
const URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

export const socket = io(URL, {
    autoConnect: false, // We will manually connect when the user opens the app
});