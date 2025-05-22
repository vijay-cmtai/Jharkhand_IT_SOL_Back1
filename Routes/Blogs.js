const express = require("express");
const upload = require("../middleware/upload.js");
const {
  createBlog,
  getBlogs,
  getBlogBySlug,
  deleteBlog,
} = require("../controllers/Blogs.js");

const router = express.Router();

router.post("/create", upload.single("image"), createBlog);
router.get("/", getBlogs);
router.get("/slug/:slug", getBlogBySlug);
router.delete("/:id", deleteBlog);

module.exports = router; // ✅ Use CommonJS export
