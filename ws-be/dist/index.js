"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = require("ws");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = require("./lib/db");
dotenv_1.default.config();
const wss = new ws_1.WebSocketServer({ port: 8080 });
const users = [];
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
        decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
    }
    catch (err) {
        console.error('Invalid token');
        ws.close();
        return;
    }
    const { userId, username: userName } = decoded;
    const user = { rooms: [], userId, userName, socket: ws };
    users.push(user);
    console.log(`New client connected: ${userName} (ID: ${userId})`);
    ws.on('message', (data) => __awaiter(void 0, void 0, void 0, function* () {
        let parsedData;
        try {
            parsedData = JSON.parse(data.toString());
        }
        catch (e) {
            console.error('Invalid JSON received');
            return;
        }
        if (parsedData.type === 'joinRoom') {
            const roomName = parsedData.roomName;
            if (!user.rooms.includes(roomName)) {
                user.rooms.push(roomName);
                console.log(`${userName} joined room: ${roomName}`);
            }
        }
        else if (parsedData.type === 'leaveRoom') {
            const roomName = parsedData.roomName;
            user.rooms = user.rooms.filter(room => room !== roomName);
            console.log(`${userName} left room: ${roomName}`);
        }
        else if (parsedData.type === 'chat') {
            const chat = parsedData;
            console.log(`${userName} sent message to ${chat.roomName}: ${chat.message}`);
            try {
                yield db_1.prismaClient.chat.create({
                    data: {
                        userId: user.userId,
                        message: chat.message,
                        roomName: chat.roomName
                    }, include: {
                        user: true
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
            }
            catch (err) {
                console.error('Database error:', err);
            }
        }
        console.log('Received message:', parsedData);
    }));
    ws.on('close', () => {
        console.log(`Client disconnected: ${userName}`);
        const index = users.findIndex(u => u.socket === ws);
        if (index !== -1)
            users.splice(index, 1);
    });
});
