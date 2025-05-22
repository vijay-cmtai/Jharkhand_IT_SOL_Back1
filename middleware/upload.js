// middleware/upload.js
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;
const dotenv = require("dotenv");
dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, // e.g. "your-cloud-name"
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "portfolio", // folder in Cloudinary
    allowed_formats: ["jpg", "png", "jpeg", "webp", "svg", "mp4", "mov"],
    resource_type: "auto", // auto = image/video
  },
});

const upload = multer({ storage });

module.exports = upload;
