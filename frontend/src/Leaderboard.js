import React, { useState, useEffect } from 'react';

const Leaderboard = () => {
    const [players, setPlayers] = useState([]);

    useEffect(() => {
        fetch('http://localhost:3001/leaderboard')
            .then(res => res.json())
            .then(data => setPlayers(data))
            .catch(err => console.error("Error loading leaderboard:", err));
    }, []);

    return (
        <div className="leaderboard">
            <h3>🏆 Top Players</h3>
            <div className="stats-grid">
                {players.length > 0 ? players.map((p, i) => (
                    <div key={i} className="stat-row">
                        <span>{p.username}</span>
                        <strong>{p.wins} Wins</strong>
                    </div>
                )) : <p>No games recorded yet.</p>}
            </div>
        </div>
    );
};

export default Leaderboard;