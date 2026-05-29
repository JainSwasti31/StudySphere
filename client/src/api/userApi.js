import axiosInstance from "./axiosInstance";

export const updateProfile = async (payload) => {
  const response = await axiosInstance.put("/users/me", payload);
  return response.data;
};

export const updatePreferences = async (payload) => {
  const response = await axiosInstance.put("/users/preferences", payload);
  return response.data;
};

export const changePassword = async (payload) => {
  const response = await axiosInstance.put("/users/change-password", payload);
  return response.data;
};
