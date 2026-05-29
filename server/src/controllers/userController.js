const User = require("../models/User");

const updateProfile = async (req, res) => {
  const { name, email, avatarUrl } = req.body;
  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ message: "User not found" });

  if (email && email.toLowerCase() !== user.email) {
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(400).json({ message: "Email already in use" });
    user.email = email.toLowerCase();
  }

  if (name !== undefined) user.name = name.trim();
  if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;

  await user.save();
  return res.status(200).json({ user });
};

const updatePreferences = async (req, res) => {
  const { preferences, notifications, privacy, appearance } = req.body;
  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ message: "User not found" });

  user.preferences = { ...user.preferences, ...(preferences || {}) };
  user.notifications = { ...user.notifications, ...(notifications || {}) };
  user.privacy = { ...user.privacy, ...(privacy || {}) };
  user.appearance = { ...user.appearance, ...(appearance || {}) };

  await user.save();
  return res.status(200).json({ user });
};

const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: "Current and new password are required" });
  }

  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ message: "User not found" });

  const isValid = await user.matchPassword(currentPassword);
  if (!isValid) return res.status(400).json({ message: "Current password is incorrect" });

  user.password = newPassword;
  await user.save();

  return res.status(200).json({ message: "Password updated" });
};

module.exports = {
  updateProfile,
  updatePreferences,
  changePassword,
};
