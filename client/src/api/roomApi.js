import axiosInstance from "./axiosInstance";

export const getRooms = async () => {
  const response = await axiosInstance.get("/rooms");
  return response.data;
};

export const createRoom = async (payload) => {
  const response = await axiosInstance.post("/rooms", payload);
  return response.data;
};

export const joinRoom = async (payload) => {
  const response = await axiosInstance.post("/rooms/join", payload);
  return response.data;
};

export const getRoomById = async (roomId) => {
  const response = await axiosInstance.get(`/rooms/${roomId}`);
  return response.data;
};

export const getRoomOnlineMembers = async (roomId) => {
  const response = await axiosInstance.get(`/rooms/${roomId}/online`);
  return response.data;
};

export const updateRoom = async (roomId, payload) => {
  const response = await axiosInstance.put(`/rooms/${roomId}`, payload);
  return response.data;
};

export const leaveRoom = async (roomId) => {
  const response = await axiosInstance.delete(`/rooms/${roomId}/leave`);
  return response.data;
};

export const deleteRoom = async (roomId) => {
  const response = await axiosInstance.delete(`/rooms/${roomId}`);
  return response.data;
};

export { fetchMessages as getMessages } from "./messageApi";