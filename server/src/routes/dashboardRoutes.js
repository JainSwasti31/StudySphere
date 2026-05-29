const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { getDashboard, updateGoals } = require("../controllers/dashboardController");

const router = express.Router();

router.get("/", protect, getDashboard);
router.put("/goals", protect, updateGoals);

module.exports = router;
