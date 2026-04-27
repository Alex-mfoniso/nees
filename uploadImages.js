import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

// Cloudinary config
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function uploadAllLocalImages() {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const files = fs.readdirSync(uploadsDir).filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
    });

    console.log(`Found ${files.length} image files in uploads/`);

    if (!process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME === 'your_cloud_name') {
        console.error("❌ Cloudinary not configured. Please set CLOUDINARY_CLOUD_NAME, API_KEY, API_SECRET in .env");
        process.exit(1);
    }

    const uploadedUrls = [];

    for (const file of files) {
        const filePath = path.join(uploadsDir, file);
        try {
            const result = await cloudinary.uploader.upload(filePath, { folder: "nees_products" });
            uploadedUrls.push(result.secure_url);
            console.log(`✅ Uploaded ${file}: ${result.secure_url}`);
        } catch (err) {
            console.error(`❌ Failed to upload ${file}:`, err.message);
        }
    }

    console.log("\n📋 All uploaded URLs:");
    uploadedUrls.forEach(url => console.log(url));

    console.log("\n💡 Copy these URLs when adding products in your app.");
}

uploadAllLocalImages().catch(err => {
    console.error("❌ Error:", err);
    process.exit(1);
});