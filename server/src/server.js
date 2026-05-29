const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const roomRoutes = require("./routes/roomRoutes");
const sessionRoutes = require("./routes/sessionRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const leaderboardRoutes = require("./routes/leaderboardRoutes");
const notesRoutes = require("./routes/notesRoutes");
const userRoutes = require("./routes/userRoutes");
const { notFound, errorHandler } = require("./middleware/errorHandler");
const Message = require("./models/Message");
const Room = require("./models/Room");
const User = require("./models/User");
const {
  ensureParticipantJoined,
  getCurrentSessionForRoom,
  leaveParticipant,
  serializeParticipant,
  serializeSession,
  sessionRoomName,
} = require("./services/sessionService");

dotenv.config();

const app = express();
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/notes", notesRoutes);
app.use("/api/users", userRoutes);
app.use(notFound);
app.use(errorHandler);

const port = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    const httpServer = http.createServer(app);

    const io = new Server(httpServer, {
      cors: {
        origin: process.env.CLIENT_URL || "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

    // expose io to controllers via app
    app.set('io', io);

    io.use((socket, next) => {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(" ")[1];

      if (!token) return next(new Error("Not authorized"));

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = decoded;
        return next();
      } catch (err) {
        return next(new Error("Not authorized"));
      }
    });

    io.on("connection", (socket) => {
      socket.on("join-room", async ({ roomId }) => {
        if (!roomId) return;
        const room = await Room.findById(roomId).select("members");
        if (!room || !room.members.some((memberId) => memberId.toString() === socket.user.id)) {
          return;
        }
        socket.currentRoomId = roomId;
        socket.join(roomId);
        const user = await User.findById(socket.user.id).select("name email");
        io.to(roomId).emit("user-joined", { user: { id: user._id.toString(), name: user.name, email: user.email } });

        // send current participants with details
        const sockets = await io.in(roomId).fetchSockets();
        const ids = sockets.map((s) => s.user.id);
        const users = await User.find({ _id: { $in: ids } }).select("name email");
        const participants = users.map((u) => ({ id: u._id.toString(), name: u.name, email: u.email }));
        io.to(roomId).emit("room-participants", { participants });

        const session = await getCurrentSessionForRoom(roomId);
        if (session && session.status !== "ended") {
          const joinResult = await ensureParticipantJoined({ session, roomId, userId: socket.user.id, joinedAt: new Date() });
          socket.join(sessionRoomName(session._id.toString()));
          io.to(sessionRoomName(session._id.toString())).emit(joinResult.isRejoin ? "user-rejoined-session" : "user-joined-session", {
            participant: serializeParticipant(session, joinResult.participant),
            session: serializeSession(session),
          });
          io.to(sessionRoomName(session._id.toString())).emit("session-state", {
            session: serializeSession(session),
            participant: serializeParticipant(session, joinResult.participant),
          });
        }
      });

      socket.on("leave-room", async ({ roomId }) => {
        if (!roomId) return;
        const room = await Room.findById(roomId).select("members");
        if (!room || !room.members.some((memberId) => memberId.toString() === socket.user.id)) {
          return;
        }
        const session = await getCurrentSessionForRoom(roomId);
        if (session) {
          const leaveResult = await leaveParticipant({ session, userId: socket.user.id, leftAt: new Date() });
          if (leaveResult.participant) {
            socket.leave(sessionRoomName(session._id.toString()));
            io.to(sessionRoomName(session._id.toString())).emit("user-left-session", {
              participant: serializeParticipant(session, leaveResult.participant),
              session: serializeSession(session),
            });
          }
        }
        socket.leave(roomId);
        if (socket.currentRoomId === roomId) {
          socket.currentRoomId = null;
        }
        io.to(roomId).emit("user-left", { userId: socket.user.id });
      });

      socket.on("send-message", async ({ roomId, text }) => {
        if (!roomId || !text) return;

        const message = await Message.create({ room: roomId, sender: socket.user.id, text });
        const populated = await message.populate("sender", "name email");

        io.to(roomId).emit("message-received", { message: {
          id: populated._id,
          text: populated.text,
          sender: populated.sender,
          createdAt: populated.createdAt,
        } });
      });

      socket.on("disconnect", async () => {
        // attempt to notify all rooms this socket was in
        const rooms = Array.from(socket.rooms).filter((r) => r !== socket.id);
        rooms.forEach((roomId) => io.to(roomId).emit("user-left", { userId: socket.user.id }));

        if (socket.currentRoomId) {
          const session = await getCurrentSessionForRoom(socket.currentRoomId);
          if (session) {
            const leaveResult = await leaveParticipant({ session, userId: socket.user.id, leftAt: new Date() });
            if (leaveResult.participant) {
              io.to(sessionRoomName(session._id.toString())).emit("user-left-session", {
                participant: serializeParticipant(session, leaveResult.participant),
                session: serializeSession(session),
              });
            }
          }
        }
      });
    });

    httpServer.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = app;