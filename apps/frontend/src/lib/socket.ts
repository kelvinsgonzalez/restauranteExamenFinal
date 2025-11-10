import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const getSocket = () => {
  if (!socket) {
    socket = io(`${import.meta.env.VITE_WS_URL ?? 'http://localhost:3000'}/ws`, {
      withCredentials: true,
      autoConnect: false,
      reconnectionAttempts: 5,
    });
  }
  return socket;
};

export const connectSocket = () => {
  const client = getSocket();
  if (!client.connected) {
    client.connect();
  }
  return client;
};

export const disconnectSocket = () => {
  if (socket?.connected) {
    socket.disconnect();
  }
};
