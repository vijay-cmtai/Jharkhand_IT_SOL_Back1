const mongoose = require("mongoose");

const blogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    excerpt: { type: String },
    content: { type: String, required: true },
    imageUrl: { type: String },
    category: { type: String, required: true },
    tags: [String],
    author: { type: String, default: "Admin" },
    publishDate: { type: Date, default: Date.now },
    metaTitle: { type: String },
    metaDescription: { type: String },
    status: { type: String, enum: ["Draft", "Published"], default: "Draft" },
  },
  { timestamps: true }
);
module.exports = mongoose.model("Blog", blogSchema);
