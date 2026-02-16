"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const Lobby_1 = require("./game/Lobby");
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: "*",
    }
});
const lobby = new Lobby_1.Lobby();
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    socket.on('join', (name) => {
        lobby.addPlayer(socket.id, name, 1000);
        broadcastState();
    });
    socket.on('action', ({ type, amount }) => {
        try {
            lobby.handleAction(socket.id, type, amount);
            broadcastState();
        }
        catch (e) {
            socket.emit('error', e.message);
        }
    });
    socket.on('startGame', () => {
        try {
            lobby.startGame();
            broadcastState();
        }
        catch (e) {
            socket.emit('error', e.message);
        }
    });
    socket.on('disconnect', () => {
        lobby.removePlayer(socket.id);
        broadcastState();
    });
    function broadcastState() {
        lobby.game.players.forEach(p => {
            io.to(p.id).emit('state', lobby.getGameView(p.id));
        });
    }
});
const PORT = 3001;
httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
