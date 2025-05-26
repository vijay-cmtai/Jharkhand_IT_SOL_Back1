// backend/middleware/multerUpload.js
const multer = require("multer");
const path = require("path"); // Still useful for originalname extension if needed

const memoryStorage = multer.memoryStorage();

const resumeFileFilter = (req, file, cb) => {
  console.log("[Multer resumeFileFilter] Incoming file:", {
    originalname: file.originalname,
    mimetype: file.mimetype,
    fieldname: file.fieldname,
  });
  const allowedMimeTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  if (allowedMimeTypes.includes(file.mimetype)) {
    console.log("[Multer resumeFileFilter] File type ACCEPTED:", file.mimetype);
    cb(null, true);
  } else {
    console.log(
      "[Multer resumeFileFilter] File type REJECTED:",
      file.mimetype,
      "- Not in allowed list:",
      allowedMimeTypes
    );
    cb(
      new Error("Invalid resume file type. Only PDF, DOC, DOCX allowed."),
      false
    );
  }
};

// Multer instance for single resume upload
const uploadResume = multer({
  storage: memoryStorage, // USE MEMORY STORAGE
  fileFilter: resumeFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

const imageFileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(
      new Error("Invalid service image file type. Only images allowed."),
      false
    );
  }
};

const uploadServiceImages = multer({
  storage: memoryStorage, // Assuming service images might also go to Cloudinary or be processed in memory
  fileFilter: imageFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).any();

module.exports = {
  uploadServiceImages,
  uploadResume,
};
