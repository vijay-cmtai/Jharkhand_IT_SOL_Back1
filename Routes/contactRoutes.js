const express = require("express");
const router = express.Router();
const contactController = require("../controllers/contact");
router.post("/submit", contactController.submitContactForm);
router.get("/find", contactController.getAllMessages);
router.put("/:id/read", contactController.updateReadStatus);
router.delete("/:id", contactController.deleteMessage);

module.exports = router;
