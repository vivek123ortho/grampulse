// middleware/uploadMiddleware.js
//
// Multer intercepts multipart/form-data requests (the format used when a
// browser uploads a file) and makes the uploaded file available as
// req.file in the controller. We use memory storage (keeps the file as a
// Buffer in RAM briefly) rather than saving to disk, since we immediately
// forward it to Cloudinary and don't need to keep a local copy.

const multer = require("multer");

const storage = multer.memoryStorage();

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE_MB = 8;

function fileFilter(req, file, cb) {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new Error("Only JPEG, PNG, and WEBP images are allowed"), false);
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE_MB * 1024 * 1024 },
});

// Used on routes as: upload.single('image')
// This expects the form field name to be "image" — the frontend form must match.
module.exports = upload;
