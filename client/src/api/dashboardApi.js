import axiosInstance from "./axiosInstance";

export const getDashboard = async () => {
  const response = await axiosInstance.get("/dashboard");
  return response.data;
};

export const updateGoals = async (payload) => {
  const response = await axiosInstance.put("/dashboard/goals", payload);
  return response.data;
};
