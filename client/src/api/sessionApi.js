import axios from './axiosInstance';

export const startSession = async (roomId) => {
  const res = await axios.post('/sessions/start', { roomId });
  return res.data;
};

export const pauseSession = async (sessionId) => {
  const res = await axios.post(`/sessions/${sessionId}/pause`);
  return res.data;
};

export const resumeSession = async (sessionId) => {
  const res = await axios.post(`/sessions/${sessionId}/resume`);
  return res.data;
};

export const endSession = async (sessionId) => {
  const res = await axios.post(`/sessions/${sessionId}/end`);
  return res.data;
};

export const joinSession = async (sessionId) => {
  const res = await axios.post(`/sessions/${sessionId}/join`);
  return res.data;
};

export const leaveSession = async (sessionId) => {
  const res = await axios.post(`/sessions/${sessionId}/leave`);
  return res.data;
};

export const getRoomSessionState = async (roomId) => {
  const res = await axios.get(`/sessions/room/${roomId}/current`);
  return res.data;
};

export const getSessionHistory = async (params = {}) => {
  const res = await axios.get("/sessions/history", { params });
  return res.data;
};

export const getSessionDetails = async (sessionId) => {
  const res = await axios.get(`/sessions/${sessionId}/details`);
  return res.data;
};
