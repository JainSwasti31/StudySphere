const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { listNotes, createNote, updateNote, deleteNote } = require("../controllers/notesController");

const router = express.Router();

router.get("/", protect, listNotes);
router.post("/", protect, createNote);
router.put("/:id", protect, updateNote);
router.delete("/:id", protect, deleteNote);

module.exports = router;
