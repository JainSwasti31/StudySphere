const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { requireRoomMember } = require("../middleware/roomMemberMiddleware");
const {
  createRoom,
  getRooms,
  getRoomById,
  getOnlineMembers,
  joinRoom,
  leaveRoom,
  deleteRoom,
  updateRoom,
} = require("../controllers/roomController");

const router = express.Router();

router.post("/", protect, createRoom);
router.get("/", protect, getRooms);
router.get("/:id", protect, requireRoomMember, getRoomById);
router.get("/:id/online", protect, requireRoomMember, getOnlineMembers);
router.get("/:id/messages", protect, requireRoomMember, async (req, res) => {
  const Message = require("../models/Message");
  const { before, limit } = req.query;
  const q = { room: req.params.id };

  if (before) {
    q._id = { $lt: before };
  }

  const messages = await Message.find(q).sort({ createdAt: -1 }).limit(parseInt(limit, 10) || 50).populate("sender", "name email");
  return res.status(200).json({ messages: messages.reverse() });
});

router.post("/:id/messages", protect, requireRoomMember, async (req, res) => {
  const Message = require("../models/Message");
  const { text } = req.body;

  if (!text) return res.status(400).json({ message: "Text is required" });

  const message = await Message.create({ room: req.params.id, sender: req.user._id, text });
  const populated = await message.populate("sender", "name email");

  return res.status(201).json({ message: { id: populated._id, text: populated.text, sender: populated.sender, createdAt: populated.createdAt } });
});
router.post("/join", protect, joinRoom);
router.put("/:id", protect, requireRoomMember, updateRoom);
router.delete("/:id/leave", protect, requireRoomMember, leaveRoom);
router.delete("/:id", protect, requireRoomMember, deleteRoom);

module.exports = router;