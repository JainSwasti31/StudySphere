const Room = require("../models/Room");

const requireRoomMember = async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id || req.params.roomId)
      .populate("owner", "name email")
      .populate("members", "name email");

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    const isMember = room.members.some((member) => {
      const memberId = member?._id || member;
      return memberId.toString() === req.user._id.toString();
    });

    if (!isMember) {
      return res.status(403).json({ message: "Access denied to this room" });
    }

    req.room = room;
    next();
  } catch (error) {
    return res.status(500).json({ message: "Unable to verify room membership" });
  }
};

module.exports = { requireRoomMember };