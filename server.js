require("dotenv").config();

const express = require("express");
const cors = require("cors");
const app = express();
const path = require("path");

// Middleware
app.use(
  cors({
    origin: "http://localhost:8080", // ✅ Allow your frontend origin
    credentials: true, // If you're using cookies/auth headers
  })
);

app.use(express.json()); // ✅ Parse application/json

// Optional: Parse form data manually if needed
// app.use(express.urlencoded({ extended: true }));

// Routes
const { connect } = require("./config/database.js");
const portfolioRoutes = require("./Routes/portfolioRoutes.js");
const authRoutes = require("./Routes/auth.js");
const BlogsRoutes = require("./Routes/Blogs.js");
const { createBlog } = require("./controllers/Blogs.js");
const contactRoute = require("./Routes/contactRoutes.js");
const serviceRoutes = require("./Routes/serviceRoutes.js");

app.use("/services", serviceRoutes);
app.use("/portfolio", portfolioRoutes);
app.use("/api/auth", authRoutes);
app.use("/blogs", BlogsRoutes);
app.use("/contact", contactRoute);
// Serve static images if you're storing uploaded files locally
app.use("/uploads", express.static(path.join(__dirname, "uploads"))); // If using local storage

// Start server
const PORT = process.env.PORT || 5000;
connect().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
