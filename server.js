require("dotenv").config();

const express = require("express");
const cors = require("cors");
const app = express();
const path = require("path");

// ✅ Allow both local and production frontends
const allowedOrigins = [
  "http://localhost:8080",
  "https://jharkhand-it-sol-front1.vercel.app","https://jharkhand-it-sol-front2.vercel.app"
];

// Middleware
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true
  })
);

app.use(express.json()); // Parse application/json

// Optional: Parse form data if needed
// app.use(express.urlencoded({ extended: true }));

// Routes
const { connect } = require("./config/database.js");
const portfolioRoutes = require("./Routes/portfolioRoutes.js");
const authRoutes = require("./Routes/auth.js");
const BlogsRoutes = require("./Routes/Blogs.js");
const contactRoute = require("./Routes/contactRoutes.js");
const serviceRoutes = require("./Routes/serviceRoutes.js");
const applicationRoutes = require("./Routes/applicationRoutes.js");

app.use("/services", serviceRoutes);
app.use("/portfolio", portfolioRoutes);
app.use("/api/auth", authRoutes);
app.use("/blogs", BlogsRoutes);
app.use("/contact", contactRoute);
app.use("/apply", applicationRoutes);


// Serve static uploads (e.g., images)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Start server
const PORT = process.env.PORT || 5000;
connect().then(() => {
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
});
