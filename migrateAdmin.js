import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

// Admin schema (same as server.js)
const adminSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
}, { timestamps: true });

const Admin = mongoose.model("Admin", adminSchema);

async function migrateAdmin() {
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
        console.error("❌ MONGODB_URI not set");
        process.exit(1);
    }

    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Create admin with the details from SQLite
    const admin = await Admin.create({
        username: "prosper",
        password: "$2b$10$BL3W2VCljM7gcFv1yMt84.e1tUd7rIptfcHfcGkd1eNoPzfK2zSXu"
    });

    console.log(`✅ Admin migrated: ${admin.username} (ID: ${admin._id})`);
    await mongoose.disconnect();
}

migrateAdmin().catch(err => {
    console.error("❌ Error:", err);
    process.exit(1);
});