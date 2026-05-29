import axiosInstance from "./axiosInstance";

export const getLeaderboard = async (period = "all") => {
  const response = await axiosInstance.get("/leaderboard", { params: { period } });
  return response.data;
};
