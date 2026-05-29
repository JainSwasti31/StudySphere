const Room = require("../models/Room");

const serializeRoom = (room) => ({
  id: room._id,
  name: room.name,
  description: room.description,
  topic: room.topic,
  owner: room.owner,
  members: room.members,
  inviteCode: room.inviteCode,
  isActive: room.isActive,
  createdAt: room.createdAt,
  updatedAt: room.updatedAt,
});

const createRoom = async (req, res) => {
  const { name, description, topic } = req.body;

  if (!name) {
    return res.status(400).json({ message: "Room name is required" });
  }

  const room = await Room.create({
    name,
    description: description || "",
    topic: topic?.trim() || "General",
    owner: req.user._id,
    members: [req.user._id],
  });

  const populatedRoom = await room.populate([
    { path: "owner", select: "name email" },
    { path: "members", select: "name email" },
  ]);

  return res.status(201).json({ room: serializeRoom(populatedRoom) });
};

const getRooms = async (req, res) => {
  const rooms = await Room.find({ members: req.user._id })
    .populate("owner", "name email")
    .populate("members", "name email")
    .sort({ createdAt: -1 });

  return res.status(200).json({ rooms: rooms.map(serializeRoom) });
};

const getRoomById = async (req, res) => {
  return res.status(200).json({ room: serializeRoom(req.room) });
};

const getOnlineMembers = async (req, res) => {
  const io = req.app.get("io");
  if (!io) return res.status(200).json({ online: [] });

  const sockets = await io.in(req.room._id.toString()).fetchSockets();
  const online = sockets
    .map((socket) => socket.user?.id)
    .filter(Boolean)
    .map((id) => id.toString());

  return res.status(200).json({ online: Array.from(new Set(online)) });
};

const joinRoom = async (req, res) => {
  const { inviteCode } = req.body;

  if (!inviteCode) {
    return res.status(400).json({ message: "Invite code is required" });
  }

  const room = await Room.findOne({ inviteCode });

  if (!room) {
    return res.status(404).json({ message: "Invalid invite code" });
  }

  const alreadyMember = room.members.some((memberId) => memberId.toString() === req.user._id.toString());

  if (!alreadyMember) {
    room.members.push(req.user._id);
    await room.save();
  }

  const populatedRoom = await room.populate([
    { path: "owner", select: "name email" },
    { path: "members", select: "name email" },
  ]);

  return res.status(200).json({ room: serializeRoom(populatedRoom) });
};

const leaveRoom = async (req, res) => {
  const room = req.room;

  room.members = room.members.filter((memberId) => memberId.toString() !== req.user._id.toString());

  if (room.owner.toString() === req.user._id.toString()) {
    const remainingOwner = room.members[0] || null;
    if (!remainingOwner) {
      await room.deleteOne();
      return res.status(200).json({ message: "Left room successfully" });
    }

    room.owner = remainingOwner;
  }

  await room.save();

  return res.status(200).json({ message: "Left room successfully" });
};

const deleteRoom = async (req, res) => {
  if (req.room.owner.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: "Only the owner can delete this room" });
  }

  await req.room.deleteOne();

  return res.status(200).json({ message: "Room deleted successfully" });
};

const updateRoom = async (req, res) => {
  if (req.room.owner.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: "Only the owner can update this room" });
  }

  const { name, description, topic } = req.body;
  if (name !== undefined && !name.trim()) {
    return res.status(400).json({ message: "Room name is required" });
  }

  if (name !== undefined) req.room.name = name.trim();
  if (description !== undefined) req.room.description = description;
  if (topic !== undefined) req.room.topic = topic.trim() || "General";

  await req.room.save();

  const populatedRoom = await req.room.populate([
    { path: "owner", select: "name email" },
    { path: "members", select: "name email" },
  ]);

  return res.status(200).json({ room: serializeRoom(populatedRoom) });
};

module.exports = {
  createRoom,
  getRooms,
  getRoomById,
  getOnlineMembers,
  joinRoom,
  leaveRoom,
  deleteRoom,
  updateRoom,
};