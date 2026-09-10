// config/cloudinary.js
//
// Cloudinary stores uploaded images in the cloud and gives us back a URL.
// This file configures the connection once; other files just call
// cloudinary.uploader.upload(...) using this configured instance.

const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

if (!process.env.CLOUDINARY_CLOUD_NAME) {
  console.warn("[cloudinary] CLOUDINARY_CLOUD_NAME is not set — image uploads will fail.");
}

module.exports = cloudinary;
