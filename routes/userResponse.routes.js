const express = require("express");
const router = express.Router();
const {
  submitEmail,
  submitQuestion,
  getProgress,
} = require("../controllers/userResponse.controller");

router.post("/submit-email", submitEmail);
router.post("/submit-question", submitQuestion);
router.get("/progress/:email", getProgress);

module.exports = router;
