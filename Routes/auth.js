// backend/routes/auth.js
const express = require("express");
const router = express.Router();
const {
  signup,
  login,
  updatePassword, // For logged-in users changing their own password
  requestPasswordReset, // For initiating forgot password
  resetPassword, // For setting new password with token
} = require("../controllers/auth");
const { protect } = require("../middleware/authMiddleware");

router.post("/signup", signup);
router.post("/login", login);
router.put("/updatepassword", protect, updatePassword); // Existing update for logged-in users

// New routes for forgot password flow
router.post("/requestpasswordreset", requestPasswordReset);
router.put("/resetpassword/:token", resetPassword); // Token will be in URL param

module.exports = router;
