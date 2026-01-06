const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { createBoard, checkWin, getBotMove, getLowestRow } = require('./gameLogic');
const { logGameEvent } = require('./kafka');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" } // Adjust for production
});

// Memory State
const games = new Map();           // gameId -> game object
const waitingQueue = [];           // Array of {socketId, username}
const reconnectionTimers = new Map(); // username -> setTimeout reference
const socketToUser = new Map();    // socketId -> username

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join', (username) => {
        socketToUser.set(socket.id, username);

        // 1. RECONNECTION LOGIC
        if (reconnectionTimers.has(username)) {
            console.log(`User ${username} reconnected. Cancelling forfeit timer.`);
            clearTimeout(reconnectionTimers.get(username));
            reconnectionTimers.delete(username);

            // Find the game they were in
            for (let [gameId, game] of games.entries()) {
                if (game.usernames.includes(username)) {
                    socket.join(gameId);
                    // Update the socket ID in the game state
                    const idx = game.usernames.indexOf(username);
                    game.players[idx] = socket.id; 
                    socket.emit('gameStart', game);
                    return;
                }
            }
        }

        // 2. MATCHMAKING LOGIC
        waitingQueue.push({ id: socket.id, username });

        if (waitingQueue.length >= 2) {
            const p1 = waitingQueue.shift();
            const p2 = waitingQueue.shift();
            initGame(p1, p2, false);
        } else {
            // Start 10s timer for Bot fallback
            setTimeout(() => {
                const index = waitingQueue.findIndex(u => u.id === socket.id);
                if (index !== -1) {
                    const p1 = waitingQueue.splice(index, 1)[0];
                    initGame(p1, { id: 'bot-id', username: 'Competitive Bot' }, true);
                }
            }, 10000);
        }
    });

    socket.on('makeMove', async ({ gameId, col }) => {
        const game = games.get(gameId);
        if (!game) return;

        const playerIndex = game.players.indexOf(socket.id);
        if (playerIndex !== game.turn) return; // Not your turn

        const row = getLowestRow(game.board, col);
        if (row === -1) return;

        // Execute Move
        game.board[row][col] = playerIndex + 1;
        
        if (checkWin(game.board, row, col, playerIndex + 1)) {
            handleGameOver(gameId, game.usernames[playerIndex]);
        } else if (game.board[0].every(cell => cell !== 0)) {
            handleGameOver(gameId, 'draw');
        } else {
            game.turn = game.turn === 0 ? 1 : 0;
            io.to(gameId).emit('updateBoard', game);

            // Bot Turn Logic
            if (game.vsBot && game.turn === 1) {
                setTimeout(() => executeBotTurn(gameId), 600);
            }
        }
    });

    socket.on('disconnect', () => {
        const username = socketToUser.get(socket.id);
        if (!username) return;

        // Find active game
        for (let [gameId, game] of games.entries()) {
            if (game.players.includes(socket.id)) {
                console.log(`Player ${username} left. Starting 30s forfeit window.`);
                
                const timer = setTimeout(() => {
                    const winnerIndex = game.usernames.indexOf(username) === 0 ? 1 : 0;
                    handleGameOver(gameId, game.usernames[winnerIndex], 'Opponent Forfeited');
                }, 30000);

                reconnectionTimers.set(username, timer);
                break;
            }
        }
        socketToUser.delete(socket.id);
    });
});

// --- HELPER FUNCTIONS ---

function initGame(p1, p2, vsBot) {
    const gameId = `game_${Date.now()}`;
    const gameState = {
        id: gameId,
        board: createBoard(),
        players: [p1.id, p2.id],
        usernames: [p1.username, p2.username],
        turn: 0,
        vsBot: vsBot
    };

    games.set(gameId, gameState);
    
    // Join rooms
    io.sockets.sockets.get(p1.id)?.join(gameId);
    if (!vsBot) io.sockets.sockets.get(p2.id)?.join(gameId);

    io.to(gameId).emit('gameStart', gameState);
}

function executeBotTurn(gameId) {
    const game = games.get(gameId);
    if (!game) return;

    const col = getBotMove(game.board);
    const row = getLowestRow(game.board, col);
    
    game.board[row][col] = 2; // Bot is always player 2

    if (checkWin(game.board, row, col, 2)) {
        handleGameOver(gameId, 'Competitive Bot');
    } else {
        game.turn = 0;
        io.to(gameId).emit('updateBoard', game);
    }
}

async function handleGameOver(gameId, winner, reason = 'Normal') {
    const game = games.get(gameId);
    if (!game) return;

    io.to(gameId).emit('gameOver', { winner, reason });

    // Bonus: Emit to Kafka
    await logGameEvent({
        type: 'GAME_FINISHED',
        data: {
            player1: game.usernames[0],
            player2: game.usernames[1],
            winner: winner,
            moves: game.board.flat().filter(c => c !== 0).length,
            timestamp: new Date()
        }
    });

    games.delete(gameId);
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server active on port ${PORT}`));