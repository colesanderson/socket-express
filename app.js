import express from "express";
import expressWs from "express-ws";
import cors from "cors";
import apiRouter from "./routes/api.js";
import { addMessage, updateUserStatus } from "./db.js";

const app = express();
const wsInstance = expressWs(app);

// Store connected clients and their info
const clients = new Map();

// Configure CORS
app.use(
  cors({
    origin: "*",
    methods: "*",
    allowedHeaders: "*",
    credentials: true,
    exposedHeaders: ["*"],
  })
);

app.use(express.json());

// Broadcast helper function
function broadcast(message) {
  const roomId = message.roomId;
  const wss = wsInstance.getWss();

  wss.clients.forEach((client) => {
    // Only send to clients in the same room
    const clientInfo = clients.get(client);
    if (
      client.readyState === 1 && // WebSocket.OPEN
      (!roomId || clientInfo?.roomId === roomId)
    ) {
      client.send(JSON.stringify(message));
    }
  });
}

function broadcastUserStatus(username, status) {
  broadcast({
    type: "user_status",
    username: username,
    status: status,
  });
}

// WebSocket route for chat
app.ws("/ws", (ws, req) => {
  console.log("New client connected to WebSocket");

  ws.on("message", async (msg) => {
    try {
      const message = JSON.parse(msg.toString());
      console.log("Received message:", message);

      switch (message.type) {
        case "auth":
          console.log("User authenticated:", message.username);
          clients.set(ws, {
            username: message.username,
            roomId: message.roomId,
          });
          await updateUserStatus(message.username, "online");
          broadcastUserStatus(message.username, "online");
          break;

        case "chat_message":
          const newMessage = {
            id: `msg${Date.now()}`,
            content: message.content,
            username: message.username,
            roomId: message.roomId,
            timestamp: new Date().toISOString(),
          };

          await addMessage(message.roomId, newMessage);

          // Broadcast to all clients in the same room
          broadcast({
            type: "chat_message",
            message: newMessage,
            roomId: message.roomId,
          });
          break;

        case "typing":
          // Broadcast typing status to all clients in the same room
          broadcast({
            type: "user_typing",
            username: message.username,
            roomId: message.roomId,
          });
          break;

        case "join_room":
          // Update client's room information
          clients.set(ws, {
            username: message.username,
            roomId: message.roomId,
          });
          break;
      }
    } catch (error) {
      console.error("WebSocket message error:", error);
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected from WebSocket");
    const clientInfo = clients.get(ws);
    if (clientInfo) {
      updateUserStatus(clientInfo.username, "offline");
      broadcastUserStatus(clientInfo.username, "offline");
    }
    clients.delete(ws);
  });

  // Send welcome message
  ws.send(
    JSON.stringify({
      type: "connection_established",
      message: "Connected to chat server",
    })
  );
});

app.use("/api", apiRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something broke!" });
});

export default app;
