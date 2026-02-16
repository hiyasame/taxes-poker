
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { Lobby } from './game/Lobby';
import { AccountManager } from './game/AccountManager';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
    }
});

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const lobby = new Lobby(IS_PRODUCTION);
const accountManager = new AccountManager(IS_PRODUCTION);

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    // 获取客户端IP
    const clientIp = socket.handshake.headers['x-forwarded-for'] as string || 
                     socket.handshake.address || 
                     socket.conn.remoteAddress || 
                     '';
    
    console.log('Client IP:', clientIp, 'Headers:', socket.handshake.headers['x-forwarded-for'], 'Address:', socket.handshake.address);

    socket.on('login', ({ username, password }: { username: string; password: string }) => {
        console.log(`Player ${username} trying to login from IP: ${clientIp}`);
        
        const loginResult = accountManager.login(username, password, socket.id);
        
        if (!loginResult.success) {
            console.log(`Login failed for ${username}: ${loginResult.message}`);
            socket.emit('error', {
                type: 'LOGIN_FAILED',
                message: loginResult.message
            });
            return;
        }
        
        const stack = loginResult.stack || 1000;
        const result = lobby.addPlayer(socket.id, username, stack, clientIp, username, password);
        
        if (result && typeof result === 'object' && 'error' in result) {
            accountManager.logout(socket.id);
            
            if (result.error === 'ROOM_FULL') {
                console.log(`Room full, ${username} cannot join`);
                socket.emit('error', {
                    type: 'ROOM_FULL',
                    message: '房间已满（最多6人），请稍后再试'
                });
            } else if (result.error === 'IP_ALREADY_CONNECTED') {
                console.log(`IP duplicate detected for ${username}, existing player: ${result.existingPlayer}`);
                socket.emit('error', {
                    type: 'IP_ALREADY_CONNECTED',
                    message: `该IP已有玩家"${result.existingPlayer}"在线，请关闭旧窗口后重试`
                });
            }
            return;
        }
        
        console.log(`Player ${username} logged in successfully with stack: ${stack}`);
        broadcastState();
    });

    socket.on('join', (name: string) => {
        console.log(`Player ${name} trying to join from IP: ${clientIp}`);
        const result = lobby.addPlayer(socket.id, name, 1000, clientIp);
        
        if (result && typeof result === 'object' && 'error' in result) {
            if (result.error === 'ROOM_FULL') {
                console.log(`Room full, ${name} cannot join`);
                socket.emit('error', {
                    type: 'ROOM_FULL',
                    message: '房间已满（最多6人），请稍后再试'
                });
            } else if (result.error === 'IP_ALREADY_CONNECTED') {
                console.log(`IP duplicate detected for ${name}, existing player: ${result.existingPlayer}`);
                socket.emit('error', {
                    type: 'IP_ALREADY_CONNECTED',
                    message: `该IP已有玩家"${result.existingPlayer}"在线，请关闭旧窗口后重试`
                });
            }
            return;
        }
        
        console.log(`Player ${name} joined successfully`);
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

    socket.on('viewCards', () => {
        const player = lobby.game.players.find(p => p.id === socket.id);
        if (player) {
            player.hasViewedCards = !player.hasViewedCards;
            broadcastState();
        }
    });

    socket.on('toggleReady', () => {
        try {
            const result = lobby.toggleReady(socket.id);
            if (!result.success) {
                socket.emit('error', result.message);
            } else {
                broadcastState();
            }
        } catch (e: any) {
            socket.emit('error', e.message);
        }
    });

    socket.on('takeSeat', (seatIndex?: number) => {
        try {
            const result = lobby.takeSeat(socket.id, seatIndex ?? -1);
            if (!result.success) {
                socket.emit('error', result.message);
            } else {
                broadcastState();
            }
        } catch (e: any) {
            socket.emit('error', e.message);
        }
    });

    socket.on('leaveTable', () => {
        try {
            const result = lobby.leaveTable(socket.id);
            if (!result.success) {
                socket.emit('error', result.message);
            } else {
                broadcastState();
            }
        } catch (e: any) {
            socket.emit('error', e.message);
        }
    });

    socket.on('disconnect', () => {
        try {
            const player = lobby.game.players.find(p => p.id === socket.id);
            if (player) {
                accountManager.updateStack(socket.id, player.stack);
            }
            accountManager.logout(socket.id);
            lobby.removePlayer(socket.id);
            broadcastState();
        } catch (e: any) {
            console.error('Error on disconnect:', e);
        }
    });

    function broadcastState() {
        try {
            lobby.game.players.forEach(p => {
                if (p.isConnected) {
                    io.to(p.id).emit('state', lobby.getGameView(p.id));
                }
            });
        } catch (e: any) {
            console.error('Error broadcasting state:', e);
        }
    }
});

const PORT = 3001;
httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${IS_PRODUCTION ? 'PRODUCTION' : 'DEVELOPMENT'}`);
    console.log(`IP Restriction: ${IS_PRODUCTION ? 'ENABLED' : 'DISABLED'}`);
    console.log(`Account Restriction: ${IS_PRODUCTION ? 'ENABLED' : 'DISABLED'}`);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
