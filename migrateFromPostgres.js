import pkg from "pg";
const { Client } = pkg;
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

async function migrateFromPostgres() {
    const postgresUrl = "postgres://nees_user:d1VwhbOwOWLmpOEWyL43xLOAowHLuhOO@dpg-d45919vdiees739131f0-a:5432/nees";
    const mongoUrl = process.env.MONGODB_URI;

    if (!mongoUrl) {
        console.error("❌ MONGODB_URI not set");
        process.exit(1);
    }

    const pgClient = new Client({ connectionString: postgresUrl });

    try {
        // Connect to PostgreSQL
        await pgClient.connect();
        console.log("✅ Connected to PostgreSQL");

        // Query products
        const result = await pgClient.query("SELECT * FROM products");
        const rows = result.rows;

        if (!rows.length) {
            console.log("⚠️  No products found in PostgreSQL database.");
            return;
        }

        console.log(`📦 Found ${rows.length} products in PostgreSQL. Migrating to MongoDB...`);

        // Connect to MongoDB
        await mongoose.connect(mongoUrl);
        console.log("✅ Connected to MongoDB Atlas");

        // Migrate each product
        let migrated = 0;
        for (const row of rows) {
            let images = [];
            try { images = row.images ? JSON.parse(row.images) : []; } catch { images = []; }

            let tags = [];
            try { tags = row.tags ? JSON.parse(row.tags) : []; } catch { tags = []; }

            await Product.create({
                name:         row.name || "Unnamed",
                type:         row.type || "general",
                description:  row.description || "",
                price:        parseFloat(row.price) || 0,
                category:     row.category || "Uncategorized",
                tags,
                exchangeable: row.exchangeable || false,
                refundable:   row.refundable || false,
                thumbnail:    row.thumbnail || "",
                images,
                availability: row.availability || "in stock",
                quantity:     row.quantity || 0,
            });

            migrated++;
            console.log(`  ✔ Migrated: ${row.name}`);
        }

        console.log(`\n🎉 Done! ${migrated} products migrated from PostgreSQL to MongoDB.`);
    } catch (err) {
        console.error("❌ Migration failed:", err.message);
    } finally {
        await pgClient.end();
        await mongoose.disconnect();
    }
}

migrateFromPostgres();