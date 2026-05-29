import axiosInstance from "./axiosInstance";

export const listNotes = async (params = {}) => {
  const response = await axiosInstance.get("/notes", { params });
  return response.data;
};

export const createNote = async (payload) => {
  const response = await axiosInstance.post("/notes", payload);
  return response.data;
};

export const updateNote = async (id, payload) => {
  const response = await axiosInstance.put(`/notes/${id}`, payload);
  return response.data;
};

export const deleteNote = async (id) => {
  const response = await axiosInstance.delete(`/notes/${id}`);
  return response.data;
};
