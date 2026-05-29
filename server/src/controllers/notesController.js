const Note = require("../models/Note");

const listNotes = async (req, res) => {
  const { q, topic, tag, sort = "updatedAt", order = "desc", pinned } = req.query;

  const filter = { userId: req.user._id };
  if (topic) filter.topic = topic;
  if (tag) filter.tags = tag;
  if (pinned !== undefined) filter.isPinned = pinned === "true";
  if (q) {
    filter.$or = [
      { title: { $regex: q, $options: "i" } },
      { content: { $regex: q, $options: "i" } },
      { topic: { $regex: q, $options: "i" } },
    ];
  }

  const sortDir = order === "asc" ? 1 : -1;
  const notes = await Note.find(filter).sort({ [sort]: sortDir }).lean();

  return res.status(200).json({ notes });
};

const createNote = async (req, res) => {
  const { title, content, topic, tags, isPinned } = req.body;
  if (!title) return res.status(400).json({ message: "Title is required" });

  const note = await Note.create({
    userId: req.user._id,
    title: title.trim(),
    content: content || "",
    topic: topic?.trim() || "General",
    tags: Array.isArray(tags) ? tags : [],
    isPinned: !!isPinned,
  });

  return res.status(201).json({ note });
};

const updateNote = async (req, res) => {
  const { id } = req.params;
  const { title, content, topic, tags, isPinned } = req.body;

  const note = await Note.findOne({ _id: id, userId: req.user._id });
  if (!note) return res.status(404).json({ message: "Note not found" });

  if (title !== undefined) note.title = title.trim();
  if (content !== undefined) note.content = content;
  if (topic !== undefined) note.topic = topic.trim() || "General";
  if (tags !== undefined) note.tags = Array.isArray(tags) ? tags : [];
  if (isPinned !== undefined) note.isPinned = !!isPinned;

  await note.save();
  return res.status(200).json({ note });
};

const deleteNote = async (req, res) => {
  const { id } = req.params;
  const note = await Note.findOne({ _id: id, userId: req.user._id });
  if (!note) return res.status(404).json({ message: "Note not found" });

  await note.deleteOne();
  return res.status(200).json({ message: "Note deleted" });
};

module.exports = {
  listNotes,
  createNote,
  updateNote,
  deleteNote,
};
