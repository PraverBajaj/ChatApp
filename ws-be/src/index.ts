import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8080 });

interface User {
    roomId : string;
    userId : string;
    userName : string;
    socket : WebSocket;
}

const users: User[] = [];

console.log('WebSocket server is running on ws://localhost:8080');
wss.on('connection', (ws , request) => {
  
  console.log('New client connected');

  ws.on('message', (message : any) => {
    console.log(`Received message: ${message}`);
    // Echo the message back to the client
    ws.send(`Server received: ${message}`);
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
}
);