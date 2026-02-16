
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { Lobby } from './game/Lobby';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
    }
});

const lobby = new Lobby();

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join', (name: string) => {
        lobby.addPlayer(socket.id, name, 1000);
        broadcastState();
    });

    socket.on('action', ({ type, amount }) => {
        try {
            lobby.handleAction(socket.id, type, amount);
            broadcastState();
        } catch (e: any) {
            socket.emit('error', e.message);
        }
    });

    socket.on('startGame', () => {
        try {
            lobby.startGame();
            broadcastState();
        } catch (e: any) {
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
