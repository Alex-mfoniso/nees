import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

// Admin schema (same as server.js)
const adminSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
}, { timestamps: true });

const Admin = mongoose.model("Admin", adminSchema);

async function checkMongoAdmin() {
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
        console.error("❌ MONGODB_URI not set");
        process.exit(1);
    }

    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    const admins = await Admin.find({});
    console.log(`Found ${admins.length} admins in MongoDB`);

    if (admins.length > 0) {
        admins.forEach(admin => {
            console.log(`ID: ${admin._id}, Username: ${admin.username}, Created: ${admin.createdAt}`);
        });
    }

    await mongoose.disconnect();
}

checkMongoAdmin().catch(err => {
    console.error("❌ Error:", err);
    process.exit(1);
});