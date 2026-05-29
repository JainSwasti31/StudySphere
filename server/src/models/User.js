const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
    },
    achievements: {
      type: [
        {
          key: { type: String, required: true },
          unlockedAt: { type: Date, required: true },
        },
      ],
      default: [],
    },
    loginDates: {
      type: [String],
      default: [],
    },
    goals: {
      weeklyHours: { type: Number, default: 0 },
      monthlyHours: { type: Number, default: 0 },
    },
    avatarUrl: {
      type: String,
      default: "",
    },
    preferences: {
      defaultSessionMinutes: { type: Number, default: 60 },
      pomodoroMinutes: { type: Number, default: 25 },
      breakMinutes: { type: Number, default: 5 },
    },
    notifications: {
      sessionReminders: { type: Boolean, default: true },
      achievementNotifications: { type: Boolean, default: true },
      roomInvites: { type: Boolean, default: true },
    },
    privacy: {
      profileVisible: { type: Boolean, default: true },
      activityVisible: { type: Boolean, default: true },
    },
    appearance: {
      theme: { type: String, default: "dark" },
      accentColor: { type: String, default: "#5eead4" },
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = function matchPassword(enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);