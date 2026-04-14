import { io } from 'socket.io-client';
import { getProfile } from './identity';

const URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3002';

export const socket = io(URL, {
    autoConnect: false,
    auth: (cb) => {
        // Fetch the profile right before connecting and send it to the server
        const profile = getProfile();
        cb({ profile });
    }
});