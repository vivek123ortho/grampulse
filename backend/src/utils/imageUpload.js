// utils/imageUpload.js
//
// Multer gives us the uploaded file as a Buffer in memory (req.file.buffer).
// Cloudinary's SDK expects either a file path or a stream, not a raw buffer,
// so this helper wraps the buffer in a stream and pipes it to Cloudinary.

const cloudinary = require("../config/cloudinary");
const { Readable } = require("stream");

/**
 * Upload an image buffer to Cloudinary and return its public URL.
 * @param {Buffer} buffer - the raw image data (from multer's memoryStorage)
 * @param {string} [folder] - Cloudinary folder to organize uploads
 * @returns {Promise<string>} the secure HTTPS URL of the uploaded image
 */
function uploadImageBuffer(buffer, folder = "grampulse/reports") {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    Readable.from(buffer).pipe(uploadStream);
  });
}

module.exports = { uploadImageBuffer };
