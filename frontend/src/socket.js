import { io } from "socket.io-client";

// This connects to your Node.js backend running on port 3001
const socket = io("http://localhost:3001");

export default socket;
