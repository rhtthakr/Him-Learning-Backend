const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const blogImageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "him-learning/blogs",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 800, height: 600, crop: "limit" }],
  },
});

const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "him-learning/avatars",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [
      { width: 200, height: 200, crop: "thumb", gravity: "face" },
    ],
  },
});

module.exports = { cloudinary, blogImageStorage, avatarStorage };
