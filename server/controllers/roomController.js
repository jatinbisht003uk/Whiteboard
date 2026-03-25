const crypto = require("crypto");

const WhiteboardRoom = require("../models/WhiteboardRoom");

function generateRoomId() {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

async function createRoom(_request, response) {
  let roomId = generateRoomId();
  let attempts = 0;

  while (attempts < 5) {
    const existingRoom = await WhiteboardRoom.findOne({ roomId }).lean();

    if (!existingRoom) {
      break;
    }

    roomId = generateRoomId();
    attempts += 1;
  }

  const room = await WhiteboardRoom.create({
    roomId,
    items: [],
    historyStack: [],
    redoStack: [],
  });

  response.status(201).json({
    roomId: room.roomId,
    itemCount: room.items.length,
  });
}

async function getRoom(request, response) {
  const roomId = String(request.params.roomId || "").trim().toUpperCase();

  if (!roomId) {
    response.status(400).json({ message: "Room ID is required." });
    return;
  }

  const room = await WhiteboardRoom.findOne({ roomId }).lean();

  if (!room) {
    response.status(404).json({ message: "Room not found." });
    return;
  }

  response.json({
    roomId: room.roomId,
    itemCount: room.items?.length || 0,
    updatedAt: room.updatedAt,
  });
}

module.exports = {
  createRoom,
  getRoom,
};
