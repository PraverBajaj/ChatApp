import { WebSocket, WebSocketServer } from 'ws';
import jwt from "jsonwebtoken";
import dotenv from 'dotenv';
import { prismaClient } from './lib/db';
dotenv.config();

const wss = new WebSocketServer({ port: 8080 });

interface User {
  rooms: string[];
  userId: string;
  userName: string;
  socket: WebSocket;
}

const users: User[] = [];

console.log('WebSocket server is running on ws://localhost:8080');

wss.on('connection', (ws, request) => {
  const url = request.url;
  if (!url) {
    ws.close();
    return;
  }

  const queryParams = new URLSearchParams(url.split("?")[1]);
  const token = queryParams.get('token');
  if (!token) {
    console.error('No token provided');
    ws.close();
    return;
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: string; username: string };
  } catch (err) {
    console.error('Invalid token');
    ws.close();
    return;
  }

  const { userId, username: userName } = decoded;

  const user: User = { rooms: [], userId, userName, socket: ws };
  users.push(user);
  console.log(`New client connected: ${userName} (ID: ${userId})`);

  ws.on('message', async (data: any) => {
    let parsedData;
    try {
      parsedData = JSON.parse(data.toString());
    } catch (e) {
      console.error('Invalid JSON received');
      return;
    }

    if (parsedData.type === 'joinRoom') {
      const roomName = parsedData.roomName;
      if (!user.rooms.includes(roomName)) {
        user.rooms.push(roomName);
        
        console.log(`${userName} joined room: ${roomName}`);
      }
    } else if (parsedData.type === 'leaveRoom') {
      const roomName = parsedData.roomName;
      user.rooms = user.rooms.filter(room => room !== roomName);
      console.log(`${userName} left room: ${roomName}`);
    } else if (parsedData.type === 'chat') {
      const chat = parsedData;
      console.log(`${userName} sent message to ${chat.roomName}: ${chat.message}`);

      try {
        await prismaClient.chat.create({
          data: {
            userId: user.userId,
            message: chat.message,
            roomName: chat.roomName
          }
        });

        users.forEach((u) => {
          if (u.rooms.includes(chat.roomName)) {
            u.socket.send(JSON.stringify({
              type: 'chat',
              userName: user.userName,
              message: chat.message,
              roomName: chat.roomName
            }));
          }
        });
      } catch (err) {
        console.error('Database error:', err);
      }
    }

    console.log('Received message:', parsedData);
  });

  ws.on('close', () => {
    console.log(`Client disconnected: ${userName}`);
    const index = users.findIndex(u => u.socket === ws);
    if (index !== -1) users.splice(index, 1);
  });
});
