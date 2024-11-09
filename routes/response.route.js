const express = require("express");
const router = express.Router();
const responseController = require("../controllers/response.controller");

router.post("/submit-email", responseController.submitEmail);
router.post("/submit-question", responseController.submitQuestion);
router.get("/progress/:email", responseController.getProgress);

module.exports = router;
