import React, { useState, useEffect } from 'react';
import socket from './socket';
import Leaderboard from './Leaderboard';
import './App.css';

function App() {
  const [username, setUsername] = useState('');
  const [joined, setJoined] = useState(false);
  const [game, setGame] = useState(null);
  const [message, setMessage] = useState('Enter your name to start');

  useEffect(() => {
    // Listen for the server to start a game
    socket.on('gameStart', (gameState) => {
      setGame(gameState);
      setJoined(true);
    });

    // Listen for board updates (moves)
    socket.on('updateBoard', (gameState) => {
      setGame(gameState);
    });

    // Listen for game end
    socket.on('gameOver', ({ winner, reason }) => {
      alert(`Game Over! Winner: ${winner} (${reason})`);
      setGame(null);
      setJoined(false);
      setMessage('Enter your name to start');
    });

    return () => {
      socket.off('gameStart');
      socket.off('updateBoard');
      socket.off('gameOver');
    };
  }, []);

  const handleJoin = () => {
    if (username.trim()) {
      socket.emit('join', username);
      setMessage('Searching for opponent... Bot joins in 10s.');
    }
  };

  const dropDisc = (col) => {
    if (game) {
      socket.emit('makeMove', { gameId: game.id, col });
    }
  };

  return (
    <div className="App">
      {!joined ? (
        <div className="join-screen">
          <h1>4 In A Row</h1>
          <input 
            type="text" 
            placeholder="Username..." 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
          />
          <button onClick={handleJoin}>Join Game</button>
          <p className="status-msg">{message}</p>
          <Leaderboard />
        </div>
      ) : (
        <div className="game-screen">
          <h2>Playing: {game.usernames[0]} vs {game.usernames[1]}</h2>
          <div className="board">
            {game.board.map((row, ri) => (
              row.map((cell, ci) => (
                <div 
                  key={`${ri}-${ci}`} 
                  className={`cell player-${cell}`} 
                  onClick={() => dropDisc(ci)}
                />
              ))
            ))}
          </div>
          <p>It is {game.usernames[game.turn]}'s turn</p>
        </div>
      )}
    </div>
  );
}

export default App;