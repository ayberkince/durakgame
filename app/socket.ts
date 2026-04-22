import { io } from "socket.io-client";

export const socket = io("http://localhost:3002", {
    autoConnect: false,
    transports: ["websocket"], // 👈 Force this to bypass CORS polling issues
    reconnection: true,
    timeout: 10000,
});