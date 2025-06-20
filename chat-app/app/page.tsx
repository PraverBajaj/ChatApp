"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Send, LogOut, Users, MessageCircle } from 'lucide-react';
import { tokenStorage } from './utils/config';

interface User {
  token: string;
  username: string;
  userId: string;
}

interface ChatResponse {
  message: string;
  roomName: string;
  createdAt: string;
  user?: { username: string };
}

interface Message {
  userName: string;
  message: string;
  roomName: string;
  timestamp: Date;
}

interface LoginForm {
  email: string;
  password: string;
}

interface SignupForm {
  email: string;
  password: string;
  username: string;
}

const Chatty = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentRoom, setCurrentRoom] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState<string>('');
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [loginForm, setLoginForm] = useState<LoginForm>({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState<SignupForm>({ email: '', password: '', username: '' });
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [roomInput, setRoomInput] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    const token = tokenStorage.get();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Date.now() / 1000;

        if (payload.exp && payload.exp < currentTime) {
          tokenStorage.remove();
          return;
        }

        setUser({
          token,
          username: payload.username,
          userId: payload.userId
        });

        connectWebSocket(token);
      } catch (error) {
        console.error('Invalid stored token:', error);
        tokenStorage.remove();
      }
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleAuth = async () => {
    const endpoint = isLogin ? '/login' : '/signup';
    const data = isLogin ? loginForm : signupForm;

    try {
      const response = await fetch(`http://localhost:3000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        if (isLogin) {
          const payload = JSON.parse(atob(result.token.split('.')[1]));
          const userData = {
            token: result.token,
            username: payload.username,
            userId: payload.userId
          };

          setUser(userData);
          tokenStorage.set(result.token);
          connectWebSocket(result.token);
        } else {
          alert('Account created successfully! Please login.');
          setIsLogin(true);
        }
      } else {
        alert(result.error || 'Authentication failed');
      }
    } catch (error) {
      console.error('Auth error:', error);
      alert('Authentication failed');
    }
  };

  const connectWebSocket = (token: string) => {
    const websocket = new WebSocket(`ws://localhost:8080?token=${token}`);

    websocket.onopen = () => {
      setIsConnected(true);
      console.log('Connected to WebSocket');
    };

    websocket.onmessage = (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      if (data.type === 'chat') {
        setMessages(prev => [...prev, {
          userName: data.userName,
          message: data.message,
          roomName: data.roomName,
          timestamp: new Date()
        }]);
      }
    };

    websocket.onclose = () => {
      setIsConnected(false);
      console.log('Disconnected from WebSocket');
    };

    websocket.onerror = (error: Event) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    setWs(websocket);
  };

  const joinRoom = async (roomName: string) => {
    if (!roomName.trim()) return;

    try {
      const response = await fetch(`http://localhost:3000/chats/${roomName}`);
      const existingChats = await response.json();

      const formattedMessages: Message[] = existingChats.map((chat: ChatResponse) => ({
        userName: chat.user?.username || 'Unknown User',
        message: chat.message,
        roomName: chat.roomName,
        timestamp: new Date(chat.createdAt)
      }));

      setMessages(formattedMessages);
      setCurrentRoom(roomName);

      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'joinRoom', roomName }));
      }
    } catch (error) {
      console.error('Error joining room:', error);
      alert('Failed to join room');
    }
  };

  const sendMessage = () => {
    if (!newMessage.trim() || !currentRoom || !ws || ws.readyState !== WebSocket.OPEN) return;

    ws.send(JSON.stringify({
      type: 'chat',
      message: newMessage,
      roomName: currentRoom
    }));

    setNewMessage('');
  };

  const leaveRoom = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'leaveRoom',
        roomName: currentRoom
      }));
    }

    setCurrentRoom('');
    setMessages([]);
  };

  const logout = () => {
    if (ws) {
      ws.close();
    }

    tokenStorage.remove();
    setUser(null);
    setCurrentRoom('');
    setMessages([]);
    setIsConnected(false);
    setLoginForm({ email: '', password: '' });
    setSignupForm({ email: '', password: '', username: '' });
  };

  const formatTime = (timestamp: Date) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour12: true,
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <MessageCircle className="mx-auto h-12 w-12 text-indigo-600 mb-4" />
            <h1 className="text-3xl font-bold text-gray-900">Chatty</h1>
            <p className="text-gray-600 mt-2">Connect and chat with friends</p>
          </div>

          <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                isLogin ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                !isLogin ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600'
              }`}
            >
              Sign Up
            </button>
          </div>

          <div className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input
                  type="text"
                  value={signupForm.username}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSignupForm(prev => ({ ...prev, username: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={isLogin ? loginForm.email : signupForm.email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  if (isLogin) {
                    setLoginForm(prev => ({ ...prev, email: e.target.value }));
                  } else {
                    setSignupForm(prev => ({ ...prev, email: e.target.value }));
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={isLogin ? loginForm.password : signupForm.password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  if (isLogin) {
                    setLoginForm(prev => ({ ...prev, password: e.target.value }));
                  } else {
                    setSignupForm(prev => ({ ...prev, password: e.target.value }));
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
              />
            </div>
            <button
              type="button"
              onClick={handleAuth}
              className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              {isLogin ? 'Login' : 'Sign Up'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <MessageCircle className="h-8 w-8 text-indigo-600" />
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Chatty</h1>
              <p className="text-sm text-gray-500">Welcome, {user.username}</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-600">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <button
              onClick={logout}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Sidebar */}
        <div className="w-80 bg-white border-r border-gray-200 p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Join Room
            </h2>
            <div className="flex space-x-2">
              <input
                type="text"
                value={roomInput}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRoomInput(e.target.value)}
                placeholder="Enter room name"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && joinRoom(roomInput)}
              />
              <button
                onClick={() => joinRoom(roomInput)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Join
              </button>
            </div>
          </div>

          {currentRoom && (
            <div className="bg-indigo-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-indigo-900">Current Room</h3>
                  <p className="text-indigo-700 font-mono text-sm">{currentRoom}</p>
                </div>
                <button
                  onClick={leaveRoom}
                  className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                >
                  Leave
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {currentRoom ? (
            <>
              {/* Chat Header */}
              <div className="bg-white border-b border-gray-200 px-6 py-4">
                <h2 className="text-lg font-medium text-gray-900">#{currentRoom}</h2>
                <p className="text-sm text-gray-500">{messages.length} messages</p>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map((msg, index) => (
                  <div key={index} className="flex flex-col">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-medium text-gray-900">{msg.userName}</span>
                      <span className="text-xs text-gray-500">{formatTime(msg.timestamp)}</span>
                    </div>
                    <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100 ml-4">
                      <p className="text-gray-800">{msg.message}</p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="bg-white border-t border-gray-200 p-4">
                <div className="flex space-x-4">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && sendMessage()}
                  />
                  <button
                    onClick={sendMessage}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2"
                  >
                    <Send className="h-4 w-4" />
                    <span>Send</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <MessageCircle className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">No room selected</h3>
                <p>Join a room to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default Chatty;
