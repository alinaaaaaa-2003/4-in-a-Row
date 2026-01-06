
# 4 In A Row — Real-Time Multiplayer Assignment

A full-stack implementation of the classic Connect Four game. This project features real-time multiplayer capabilities, a strategic bot fallback, and a decoupled analytics pipeline using Kafka.

## 🕹 Features

* **Real-time Gameplay:** Bi-directional synchronization using **Socket.io**.
* **Matchmaking:** 10-second player queue with an automatic fallback to a **Competitive Bot**.
* **Strategic Bot:** Implemented using a priority-weighted algorithm:
1. **Immediate Win:** Takes the winning move if available.
2. **Immediate Block:** Prevents the opponent from winning on their next turn.
3. **Strategic Center:** Prioritizes center columns to maximize winning paths.


* **Reconnection Logic:** Players have 30 seconds to rejoin a disconnected session before the game is forfeited.
* **Analytics Pipeline:** Decoupled event tracking using **Kafka** and **PostgreSQL**.

## 🛠 Tech Stack

* **Frontend:** React.js
* **Backend:** Node.js (Express)
* **Real-time:** Socket.io
* **Database:** PostgreSQL (via Prisma ORM)
* **Messaging:** Kafka (Kafkajs)
* **Containerization:** Docker & Docker Compose

---

## 🚀 Local Setup Instructions

Follow these steps to run the project locally on your machine.

### 1. Prerequisites

* [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.
* [Node.js](https://nodejs.org/) (v18+) installed.

### 2. Infrastructure Setup

In the root directory, start the PostgreSQL and Kafka containers:

```bash
docker-compose up -d

```

### 3. Backend Setup

Navigate to the backend folder and install dependencies:

```bash
cd backend
npm install

```

Create a `.env` file in the `backend` folder and add the following connection string:

```text
DATABASE_URL="postgresql://user:password@localhost:5432/game_db?schema=public"

```

Sync the database schema:

```bash
npx prisma db push

```

### 4. Running the Project

You will need **three separate terminal windows**:

* **Terminal 1 (Game Server):**
```bash
cd backend
node server.js

```


* **Terminal 2 (Analytics Worker):**
```bash
cd backend
node analyticsService.js

```


* **Terminal 3 (Frontend):**
```bash
cd frontend
npm install
npm start

```



---

## 🧠 Core Engineering Logic

### Competitive Bot Strategy

Unlike random-move bots, this bot analyzes the board state:

* **Horizontal, Vertical, and Diagonal Checks:** The bot uses the same win-condition logic as the players to "scout" potential moves.
* **Defensive Play:** If the human player has 3-in-a-row with an open end, the bot is programmed to prioritize blocking that column.

### Decoupled Analytics (Kafka)

To ensure the game server remains performant and non-blocking, all analytics (wins, game duration, and leaderboards) are handled asynchronously:

1. `server.js` emits a `GAME_FINISHED` event to a Kafka topic.
2. `analyticsService.js` (the consumer) picks up the event.
3. The consumer updates the PostgreSQL database and the global leaderboard.

---

## 📂 Project Structure

```text
Emitrr-Assignment/
├── backend/
│   ├── prisma/             # Database Schema & Migrations
│   ├── server.js           # Main Socket.io Server
│   ├── analyticsService.js # Kafka Consumer / Analytics Worker
│   ├── gameLogic.js        # Core Board Logic & Bot AI
│   └── kafka.js            # Kafka Producer Configuration
├── frontend/
│   ├── src/                # React Components (App, Leaderboard)
│   └── public/             # Static Assets
└── docker-compose.yml      # Kafka & Postgres Orchestration

```

---

## 📹 Demo & Verification

* **Matchmaking:** Enter a name and wait 10s to see the Bot join automatically.
* **Persistence:** After a game ends, refresh the page to see the updated Leaderboard fetched from the database.
* **Reliability:** Try refreshing during a game; the 30s reconnection logic will restore your session.

---

