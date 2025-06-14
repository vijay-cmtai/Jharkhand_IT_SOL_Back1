const multer = require("multer");

// Use memoryStorage to handle files as buffers in memory, which is ideal for uploading to a third-party service like Cloudinary.
const memoryStorage = multer.memoryStorage();

// Filter for image files
const imageFileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only images are allowed."), false);
  }
};

// Filter for resume files (PDF, DOC, DOCX)
const resumeFileFilter = (req, file, cb) => {
    const allowedMimeTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Invalid resume file type. Only PDF, DOC, DOCX allowed."), false);
    }
};

// Multer instance for service images (accepts any number of files)
const uploadServiceImages = multer({
  storage: memoryStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
}).any();

// Multer instance for resume (to be used with .single() in the route)
const uploadResume = multer({
  storage: memoryStorage,
  fileFilter: resumeFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});


module.exports = {
  uploadServiceImages,
  uploadResume,
};
