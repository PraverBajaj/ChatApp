"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = require("ws");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
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
    const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
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
    const user = {
        rooms: [],
        userId: userId,
        userName: userName,
        socket: ws
    };
    users.push(user);
    console.log('New client connected ' + userName + ' with ID: ' + userId);
    ws.on('message', (data) => {
        console.log('Received message:', data);
    });
    ws.on('close', () => {
        console.log('Client disconnected');
    });
});
