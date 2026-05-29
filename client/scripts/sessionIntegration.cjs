const axios = require("axios");
const io = require("socket.io-client");

const API = process.env.API_URL || "http://localhost:5000";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForEvent = (socket, event, timeout = 5000) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${event} timeout`)), timeout);
    socket.once(event, (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });

async function registerAndLogin(tag) {
  const suffix = Date.now();
  const user = { name: `${tag}${suffix}`, email: `${tag.toLowerCase()}${suffix}@test.local`, password: "Password123!" };
  await axios.post(`${API}/api/auth/register`, user).catch(() => {});
  const login = await axios.post(`${API}/api/auth/login`, { email: user.email, password: user.password });
  return { user, token: login.data.token, profile: login.data.user };
}

async function run() {
  const owner = await registerAndLogin("Owner");
  const guest = await registerAndLogin("Guest");

  const roomRes = await axios.post(
    `${API}/api/rooms`,
    { name: "SessionRoom", description: "Phase 4 integration room" },
    { headers: { Authorization: `Bearer ${owner.token}` } }
  );

  const room = roomRes.data.room || roomRes.data;
  const roomId = room.id || room._id;
  const ownerId = owner.profile._id || owner.profile.id;
  const guestId = guest.profile._id || guest.profile.id;

  await axios.post(
    `${API}/api/rooms/join`,
    { inviteCode: room.inviteCode },
    { headers: { Authorization: `Bearer ${guest.token}` } }
  );

  const ownerSocket = io(API, { auth: { token: owner.token } });
  const guestSocket = io(API, { auth: { token: guest.token } });

  await Promise.all([
    new Promise((resolve) => ownerSocket.on("connect", resolve)),
    new Promise((resolve) => guestSocket.on("connect", resolve)),
  ]);

  const roomJoinedPromise = waitForEvent(ownerSocket, "room-participants");
  ownerSocket.emit("join-room", { roomId });
  await roomJoinedPromise;

  const startedPromise = waitForEvent(ownerSocket, "session-started");
  const startRes = await axios.post(`${API}/api/sessions/start`, { roomId }, { headers: { Authorization: `Bearer ${owner.token}` } });
  const sessionId = startRes.data.session.id;
  const started = await startedPromise;
  if (!started?.session || started.session.status !== "active") {
    throw new Error("session-started payload missing active session");
  }

  await wait(1200);
  guestSocket.emit("join-room", { roomId });
  await wait(500);

  const stateAfterJoin = await axios.get(`${API}/api/sessions/room/${roomId}/current`, {
    headers: { Authorization: `Bearer ${owner.token}` },
  });

  const guestParticipant = stateAfterJoin.data.participants.find((participant) => participant.userId === guestId);
  if (!guestParticipant) {
    throw new Error(`guest participant record not found: ${JSON.stringify(stateAfterJoin.data.participants)}`);
  }

  if ((guestParticipant.joinedLateMs || 0) <= 0) {
    throw new Error("guest late-join duration was not tracked");
  }

  const pausedPromise = waitForEvent(ownerSocket, "session-paused");
  const pauseRes = await axios.post(`${API}/api/sessions/${sessionId}/pause`, {}, { headers: { Authorization: `Bearer ${owner.token}` } });
  if (pauseRes.data.session.status !== "paused") {
    throw new Error("pause did not set paused status");
  }
  await pausedPromise;

  const resumedPromise = waitForEvent(ownerSocket, "session-resumed");
  const resumeRes = await axios.post(`${API}/api/sessions/${sessionId}/resume`, {}, { headers: { Authorization: `Bearer ${owner.token}` } });
  if (resumeRes.data.session.status !== "active") {
    throw new Error("resume did not set active status");
  }
  await resumedPromise;

  const leftPromise = waitForEvent(ownerSocket, "user-left-session");
  const leaveRes = await axios.post(`${API}/api/sessions/${sessionId}/leave`, {}, { headers: { Authorization: `Bearer ${guest.token}` } });
  if (leaveRes.data.participant.isActive) {
    throw new Error("guest leave did not close active participation");
  }
  await leftPromise;

  const rejoinedPromise = waitForEvent(ownerSocket, "user-rejoined-session");
  const rejoinRes = await axios.post(`${API}/api/sessions/${sessionId}/join`, {}, { headers: { Authorization: `Bearer ${guest.token}` } });
  if (!rejoinRes.data.participant.isActive || (rejoinRes.data.participant.rejoinCount || 0) < 1) {
    throw new Error("guest rejoin was not tracked correctly");
  }
  await rejoinedPromise;

  const endedPromise = waitForEvent(ownerSocket, "session-ended");
  const endRes = await axios.post(`${API}/api/sessions/${sessionId}/end`, {}, { headers: { Authorization: `Bearer ${owner.token}` } });
  if (endRes.data.session.status !== "ended") {
    throw new Error("end did not set ended status");
  }
  await endedPromise;

  const finalState = await axios.get(`${API}/api/sessions/room/${roomId}/current`, {
    headers: { Authorization: `Bearer ${owner.token}` },
  }).catch((error) => error.response);

  if (finalState?.data?.session) {
    throw new Error("ended session should not be returned as current room session");
  }

  ownerSocket.close();
  guestSocket.close();
  console.log("Session integration PASSED");
}

run().catch((error) => {
  console.error("Session integration FAILED:", error.config?.method?.toUpperCase(), error.config?.url, error.response?.status, error.response?.data?.message || error.message || error);
  process.exit(1);
});