const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { updateProfile, updatePreferences, changePassword } = require("../controllers/userController");

const router = express.Router();

router.put("/me", protect, updateProfile);
router.put("/preferences", protect, updatePreferences);
router.put("/change-password", protect, changePassword);

module.exports = router;
