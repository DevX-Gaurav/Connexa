// import multer from "multer";
// import { v2 as cloudinary } from "cloudinary";
// import dotenv from "dotenv";
// import fs from "fs";

// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
//   secure: true,
// });

// const uploadToCloudinary = (file) => {
//   const options = {
//     resource_type: file.mimetype.startsWith("video") ? "video" : "image",
//   };
//   return new Promise((resolve, reject) => {
//     const uploader = file.mimetype.startsWith("video")
//       ? cloudinary.uploader.upload_large
//       : cloudinary.uploader.upload;
//     uploader(file.path, options, (error, result) => {
//       fs.unlink(file.path, () => {});
//       if (error) {
//         return reject(error);
//       }
//       resolve(
//         result
//       ); /* this result will store the url of the file which we will upload using multer */
//     });
//   });
// };

// const multerMiddleware = multer({ dest: "uploads/" }).single("media");

// export { uploadToCloudinary, multerMiddleware };

import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

/* Cloudinary Configuration */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/* Multer Setup (Memory Storage)*/
const storage = multer.memoryStorage(); // keep files in memory for serverless environments like Vercel
const multerMiddleware = multer({ storage }).single("media");

/*Cloudinary Upload Function*/
const uploadToCloudinary = async (file) => {
  if (!file) return null;

  try {
    // Determine type (image/video)
    const resourceType = file.mimetype.startsWith("video") ? "video" : "image";

    // Convert buffer to temp file (for large uploads compatibility)
    const tempFilePath = path.join(
      "/tmp",
      `${Date.now()}-${file.originalname}`
    );
    fs.writeFileSync(tempFilePath, file.buffer);

    const uploader =
      resourceType === "video"
        ? cloudinary.uploader.upload_large
        : cloudinary.uploader.upload;

    const result = await uploader(tempFilePath, {
      resource_type: resourceType,
      folder: "connexa_uploads", // optional folder name in Cloudinary
    });

    fs.unlinkSync(tempFilePath); // clean up temp file after upload

    return result;
  } catch (error) {
    console.error(" Cloudinary upload failed:", error);
    throw error;
  }
};

export { uploadToCloudinary, multerMiddleware };
