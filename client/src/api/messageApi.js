import axiosInstance from "./axiosInstance";

export const fetchMessages = async (roomId, { before, limit } = {}) => {
  const params = {};
  if (before) params.before = before;
  if (limit) params.limit = limit;

  const response = await axiosInstance.get(`/rooms/${roomId}/messages`, { params });
  return response.data;
};

export const postMessageRest = async (roomId, payload) => {
  const response = await axiosInstance.post(`/rooms/${roomId}/messages`, payload);
  return response.data;
};