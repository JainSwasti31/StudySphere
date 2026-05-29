const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema(
  {
    room: { type: mongoose.Schema.Types.ObjectId, ref: "Room", required: true, index: true },
    startedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    startedAt: { type: Date, default: Date.now },
    pausedAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
    status: { type: String, enum: ["active", "paused", "ended"], default: "active" },
    pauseIntervals: [
      {
        pausedAt: { type: Date, required: true },
        resumedAt: { type: Date, default: null },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Session", sessionSchema);
