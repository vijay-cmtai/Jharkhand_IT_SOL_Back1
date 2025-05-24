// backend/middleware/multerUpload.js
const multer = require("multer");
const path = require("path");

const memoryStorage = multer.memoryStorage();
// File filter to accept only images
const imageFileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(null, false); 
  }
};
const resumeFileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

const uploadServiceImages = multer({
  storage: memoryStorage, // Use memory storage
  fileFilter: imageFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit, adjust as needed
}).any(); 
// Multer instance for single resume upload
const uploadResume = multer({
  storage: memoryStorage, // Use memory storage
  fileFilter: resumeFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, 
  },
});

module.exports = {
  uploadServiceImages,
  uploadResume,
};
