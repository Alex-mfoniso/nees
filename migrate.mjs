import initSqlJs from "sql.js";
import fs from "fs";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

// Product schema (same as server.js)
const productSchema = new mongoose.Schema({
    name:         { type: String, required: true },
    type:         { type: String, default: "general" },
    description:  { type: String, default: "" },
    price:        { type: Number, required: true },
    category:     { type: String, required: true },
    tags:         { type: [String], default: [] },
    exchangeable: { type: Boolean, default: false },
    refundable:   { type: Boolean, default: false },
    thumbnail:    { type: String, default: "" },
    images:       { type: [String], default: [] },
    availability: { type: String, default: "in stock" },
    quantity:     { type: Number, default: 0 },
}, { timestamps: true });

const Product = mongoose.model("Product", productSchema);

async function migrate() {
    try {
        // 1. Load SQLite
        const SQL = await initSqlJs();
        const buf = fs.readFileSync("./database.sqlite");
        const db  = new SQL.Database(buf);

        // 2. Read products from SQLite
        const result = db.exec("SELECT * FROM products");

        if (!result.length || !result[0].values.length) {
            console.log("⚠️  No products found in SQLite database.");
            return;
        }

        const columns = result[0].columns;
        const rows    = result[0].values;

        console.log(`📦 Found ${rows.length} products in SQLite. Migrating to MongoDB...`);

        // 3. Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("✅ Connected to MongoDB Atlas");

        // 4. Insert each product
        let migrated = 0;
        for (const row of rows) {
            const obj = {};
            columns.forEach((col, i) => obj[col] = row[i]);

            let images = [];
            try { images = obj.images ? JSON.parse(obj.images) : []; } catch { images = []; }

            await Product.create({
                name:         obj.name || "Unnamed",
                type:         obj.type || "general",
                description:  obj.description || "",
                price:        parseFloat(obj.price) || 0,
                category:     obj.category || "Uncategorized",
                tags:         [],
                exchangeable: obj.exchangeable === 1,
                refundable:   obj.refundable === 1,
                thumbnail:    obj.thumbnail || "",
                images,
                availability: obj.availability || "in stock",
                quantity:     obj.quantity || 0,
            });

            migrated++;
            console.log(`  ✔ Migrated: ${obj.name}`);
        }

        console.log(`\n🎉 Done! ${migrated} products migrated to MongoDB.`);
        await mongoose.disconnect();
    } catch (err) {
        console.error("❌ Migration failed:", err.message);
        process.exit(1);
    }
}

migrate().catch(err => {
    console.error("❌ Migration failed:", err.message);
    process.exit(1);
});
