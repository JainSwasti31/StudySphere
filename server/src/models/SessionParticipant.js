const mongoose = require("mongoose");

const intervalSchema = new mongoose.Schema(
  {
    joinedAt: { type: Date, required: true },
    leftAt: { type: Date, default: null },
  },
  { _id: false }
);

const sessionParticipantSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: "Room", required: true, index: true },
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "Session", required: true, index: true },
    intervals: { type: [intervalSchema], default: [] },
    currentJoinedAt: { type: Date, default: null },
    isActive: { type: Boolean, default: false },
    totalDurationMs: { type: Number, default: 0 },
    lastJoinedAt: { type: Date, default: null },
    lastLeftAt: { type: Date, default: null },
  },
  { timestamps: true }
);

sessionParticipantSchema.index({ sessionId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("SessionParticipant", sessionParticipantSchema);