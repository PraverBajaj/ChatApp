import { WebSocket, WebSocketServer } from 'ws';
import jwt from "jsonwebtoken"
import dotenv from 'dotenv';
import { prismaClient } from './lib/db'; // Adjust the import path as necessary
dotenv.config();

const wss = new WebSocketServer({ port: 8080 });

interface User {
    rooms : string[];
    userId : string;
    userName : string;
    socket : WebSocket;
}

const users: User[] = [];

console.log('WebSocket server is running on ws://localhost:8080');
wss.on('connection', (ws , request) => {
  const url = request.url;
  if(!url){
    ws.close();
    return;
  }

  const queryParams = new URLSearchParams(url.split("?")[1])
  const token = queryParams.get('token');
  if (!token) {
    console.error('No token provided');
    ws.close();
    return;
  }
  const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {userId : string , username : string};
  const userId = decoded.userId;
  const userName = decoded.username;
  if (!userName) {
    console.error('No username provided in token');
    ws.close();
    return;
  }

  if (!userId) {
    console.error('Invalid token');
    ws.close();
    return;
  }

  const user: User = {
    rooms: [],
    userId: userId,
    userName: userName,
    socket: ws
  };
  users.push(user);

  console.log('New client connected ' + userName + ' with ID: ' + userId);

  ws.on('message', async (data : any) => {
    const parsedData = JSON.parse(data.toString())
    if (parsedData.type === 'joinRoom') {
      const roomName = parsedData.roomName;
      user.rooms.push(roomName);
      console.log(`${userName} joined room: ${roomName}`);
    } else if (parsedData.type === 'leaveRoom') {
      const roomName = parsedData.roomName;
      user.rooms = user.rooms.filter(room => room !== roomName);
      console.log(`${userName} left room: ${roomName}`);
    } else if (parsedData.type === 'chat') {
      const chat = parsedData.chat;
      console.log(`${userName} sent message: ${chat}`);
      await prismaClient.chat.create({
        data: {
          userId: user.userId,
          username: user.userName,
          message: chat.message }
    })
    console.log('Received message:', JSON.parse(data))});

  ws.on('close', () => {
    console.log('Client disconnected');
  })});