const Blog = require("../model/Blogs.js");
const slugify = require("slugify");

// Create blog
const createBlog = async (req, res) => {
  try {
    const {
      title,
      excerpt,
      content,
      category,
      tags,
      author,
      publishDate,
      metaTitle,
      metaDescription,
      status,
    } = req.body;

    const slug = slugify(title, { lower: true });
    const imageUrl = req.file?.path || "";

    const blog = new Blog({
      title,
      slug,
      excerpt,
      content,
      category,
      tags: tags?.split(",").map((t) => t.trim()),
      author,
      publishDate,
      metaTitle,
      metaDescription,
      status,
      imageUrl,
    });

    await blog.save();
    res.status(201).json(blog);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
const getBlogBySlug = async (req, res) => {
  try {
    const blogSlug = req.params.slug;
    const blog = await Blog.findOne({ slug: blogSlug }); // Use findOne with the slug

    if (!blog) {
      return res.status(404).json({ message: "Blog post not found" });
    }

    res.status(200).json(blog);
  } catch (error) {
    console.error("Error fetching blog by slug:", error);
    res
      .status(500)
      .json({
        message: "Server error while fetching blog post",
        error: error.message,
      });
  }
};

// Get all blogs
const getBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    res.json(blogs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
const deleteBlog = async (req, res) => {
  try {
    const blogId = req.params.id;
    const blog = await Blog.findByIdAndDelete(blogId);

    if (!blog) {
      return res.status(404).json({ message: "Blog post not found" });
    }
    res.status(200).json({ message: "Blog post deleted successfully" });
  } catch (err) {
    console.error("Error in deleteBlog:", err);
    if (err.kind === 'ObjectId') { // Handle invalid ObjectId format
        return res.status(400).json({ error: "Invalid blog post ID format." });
    }
    res.status(500).json({ error: err.message });
  }
};


module.exports = {
  createBlog,
  getBlogs,
  getBlogBySlug,
  deleteBlog
};
