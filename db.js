import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Define default data structure
const defaultData = { chatRooms: [], messages: {}, users: [] };

// Use JSON file for storage
const adapter = new JSONFile(join(__dirname, "db.json"));
const db = new Low(adapter, defaultData);

// Initialize the database
await db.read();
if (!db.data) {
  db.data = defaultData;
  await db.write();
}

// User management functions
export async function getUsers() {
  await db.read();
  return db.data.users;
}

export async function getUserByUsername(username) {
  await db.read();
  return db.data.users.find((u) => u.username === username);
}

export async function createUser(username, password) {
  await db.read();
  if (!db.data.users) {
    db.data.users = [];
  }

  // Check if username already exists
  const existingUser = await getUserByUsername(username);
  if (existingUser) {
    throw new Error("Username already taken");
  }

  const newUser = {
    id: `user${Date.now()}`,
    username,
    password,
    status: "online",
  };

  db.data.users.push(newUser);
  await db.write();
  return newUser;
}

export async function verifyUser(username, password) {
  const user = await getUserByUsername(username);
  if (!user || user.password !== password) {
    return null;
  }
  return user;
}

export async function updateUserStatus(userId, status) {
  await db.read();
  const user = db.data.users.find((u) => u.id === userId);
  if (user) {
    user.status = status;
    await db.write();
  }
  return user;
}

export async function createChatRoom(name) {
  await db.read();
  const id = "room" + (db.data.chatRooms.length + 1);
  const newRoom = { id, name };
  db.data.chatRooms.push(newRoom);
  db.data.messages[id] = [];
  await db.write();
  return newRoom;
}

export async function getChatRooms() {
  await db.read();
  return db.data.chatRooms;
}

// Add these two functions that were missing
export async function addMessage(roomId, message) {
  await db.read();
  if (!db.data.messages[roomId]) {
    db.data.messages[roomId] = [];
  }
  db.data.messages[roomId].push(message);
  await db.write();
  return message;
}

export async function getMessages(roomId) {
  await db.read();
  return db.data.messages[roomId] || [];
}

export { db };
