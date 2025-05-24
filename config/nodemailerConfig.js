// backend/config/nodemailerConfig.js
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
dotenv.config(); // Load .env variables
const transporter = nodemailer.createTransport({
  service: "gmail", // or your email provider
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Verify connection configuration (optional, run once at server start)
transporter.verify(function (error, success) {
  if (error) {
    console.error("Nodemailer configuration error:", error);
  } else {
    console.log("Nodemailer is ready to send emails");
  }
});

module.exports = transporter;
