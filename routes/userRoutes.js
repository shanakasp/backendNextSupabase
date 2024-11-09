const express = require("express");
const {
  submitEmail,
  submitQuestion,
  getProgress,
} = require("../controllers/userController");

const router = express.Router();

// Route to handle user details submission (Step 1)
router.post("/submit-email", submitEmail);

// Route to handle question responses (Steps 2 and 3)
router.post("/submit-question", submitQuestion);

// Route to get current progress
router.get("/progress/:email", getProgress);

module.exports = router;
