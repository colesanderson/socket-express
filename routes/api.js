import express from "express";
import {
  getUsers,
  createUser,
  verifyUser,
  updateUserStatus,
  createChatRoom,
  getChatRooms,
  addMessage,
  getMessages,
  getUserByUsername,
} from "../db.js";

const router = express.Router();

// User Routes
router.get("/users", async (req, res) => {
  try {
    const users = await getUsers();
    res.json(
      users.map((user) => ({
        id: user.id,
        username: user.username,
        status: user.status,
      }))
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/users/register", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "Username and password are required" });
    }
    const user = await createUser(username, password);
    res.status(201).json({
      id: user.id,
      username: user.username,
      status: user.status,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/users/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await verifyUser(username, password);
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    // Update user status to online
    await updateUserStatus(user.id, "online");
    res.json({
      id: user.id,
      username: user.username,
      status: user.status,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/users/:username/status", async (req, res) => {
  try {
    const { username } = req.params;
    const { status } = req.body;

    // First get the user by username
    const user = await getUserByUsername(username);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Then update status using the user's ID
    const updatedUser = await updateUserStatus(user.id, status);
    res.json({
      id: updatedUser.id,
      username: updatedUser.username,
      status: updatedUser.status,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Chat Room Routes
router.get("/rooms", async (req, res) => {
  try {
    const rooms = await getChatRooms();
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/rooms", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Room name is required" });
    }
    const room = await createChatRoom(name);
    res.status(201).json(room);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Messages Routes
router.get("/rooms/:roomId/messages", async (req, res) => {
  try {
    const { roomId } = req.params;
    const messages = await getMessages(roomId);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/rooms/:roomId/messages", async (req, res) => {
  try {
    const { roomId } = req.params;
    const { content, username } = req.body;
    if (!content || !username) {
      return res
        .status(400)
        .json({ error: "Content and username are required" });
    }

    const message = {
      id: `msg${Date.now()}`,
      content,
      username,
      roomId,
      timestamp: new Date().toISOString(),
    };

    const savedMessage = await addMessage(roomId, message);
    res.status(201).json(savedMessage);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add this new route for getting user by username
router.get("/users/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const user = await getUserByUsername(username);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      id: user.id,
      username: user.username,
      status: user.status,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
