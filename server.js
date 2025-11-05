
// import path from "path";
// import express from "express";
// import bodyParser from "body-parser";
// import bcrypt from "bcryptjs";
// import jwt from "jsonwebtoken";
// import cors from "cors";
// import multer from "multer";
// import { Pool } from "pg"; // <-- NEW: Import PostgreSQL Pool
// import fs from "fs";
// // import initSqlJs from "sql.js"; // <-- REMOVE: No longer needed

// // --- Initialization ---
// const app = express();
// const JWT_SECRET = "supersecretkey";

// // ==========================
// // POSTGRESQL CONFIGURATION
// // ==========================
// // Use a persistent connection URL from your hosting environment (e.g., Render)
// const connectionString = process.env.DATABASE_URL;
// if (!connectionString) {
//   console.error("❌ FATAL: DATABASE_URL environment variable is not set.");
//   process.exit(1);
// }

// // Create a connection pool (recommended for web servers)
// // Create a connection pool
// const pool = new Pool({
//     connectionString, // The version *without* ?ssl=true
//     ssl: {
//         rejectUnauthorized: false, 
//         checkServerIdentity: () => null, 
//     },
// });

// // ==========================
// // DB Initialization Function
// // ==========================
// async function initDb() {
//   try {
//     const client = await pool.connect();

//     // 1. Create Admins Table
//     await client.query(`
//             CREATE TABLE IF NOT EXISTS admins (
//                 id SERIAL PRIMARY KEY,
//                 username TEXT UNIQUE NOT NULL,
//                 password TEXT NOT NULL
//             );
//         `);

//     // 2. Create Products Table
//     await client.query(`
//             CREATE TABLE IF NOT EXISTS products (
//                 id SERIAL PRIMARY KEY,
//                 name TEXT NOT NULL,
//                 type TEXT,
//                 description TEXT,
//                 price REAL NOT NULL,
//                 category TEXT NOT NULL,
//                 tags TEXT,
//                 exchangeable INTEGER DEFAULT 0,
//                 refundable INTEGER DEFAULT 0,
//                 thumbnail TEXT,
//                 images TEXT,
//                 availability TEXT
//             );
//         `);
//     client.release();
//     console.log("✅ PostgreSQL tables ensured.");
//   } catch (err) {
//     console.error("❌ Error initializing PostgreSQL database:", err);
//     // It's crucial to exit if the DB can't be reached
//     process.exit(1);
//   }
// }

// // ==========================
// // DIRECTORY SETUP (Kept for Multer/Images)
// // ==========================
// const uploadDir = path.join(process.cwd(), "uploads");
// if (!fs.existsSync(uploadDir)) {
//   fs.mkdirSync(uploadDir, { recursive: true });
// }

// // ==========================
// // MULTER CONFIG (Kept as is)
// // ==========================
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => cb(null, uploadDir),
//   filename: (req, file, cb) => {
//     const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
//     const extension = path.extname(file.originalname);
//     cb(null, file.fieldname + "-" + uniqueSuffix + extension);
//   },
// });
// const upload = multer({ storage });

// // ==========================
// // MIDDLEWARE (Kept as is)
// // ==========================
// app.use("/uploads", express.static(uploadDir));
// app.use(bodyParser.json());
// app.use(
//   cors({
//     origin: "*",
//     methods: ["GET", "POST", "PUT", "DELETE"],
//   })
// );

// // ==========================
// // AUTH MIDDLEWARE (Kept as is)
// // ==========================
// const authenticate = (req, res, next) => {
//   const header = req.headers.authorization;
//   if (!header) return res.status(401).json({ error: "Missing token" });

//   const token = header.split(" ")[1];
//   try {
//     const decoded = jwt.verify(token, JWT_SECRET);
//     req.admin = decoded;
//     next();
//   } catch {
//     res.status(401).json({ error: "Invalid token" });
//   }
// };

// // ==========================
// // ROOT
// // ==========================
// app.get("/", (req, res) => res.send("API alive with PostgreSQL"));

// // ==========================
// // ADMIN ROUTES
// // ==========================

// // REGISTER (Rewritten for PostgreSQL)
// app.post("/api/admin/register", async (req, res) => {
//   const { username, password } = req.body;
//   if (!username || !password)
//     return res.status(400).json({ error: "Username and password required" });

//   const hashed = bcrypt.hashSync(password, 10);

//   try {
//     const result = await pool.query(
//       "INSERT INTO admins (username, password) VALUES ($1, $2) RETURNING id;",
//       [username, hashed]
//     );
//     res.status(201).json({ message: "Admin created", id: result.rows[0].id });
//   } catch (err) {
//     if (err.code === "23505") {
//       // PostgreSQL unique violation error code
//       res.status(400).json({ error: "Username already exists" });
//     } else {
//       console.error("Admin registration error:", err);
//       res.status(500).json({ error: err.message });
//     }
//   }
// });

// // LOGIN (Rewritten for PostgreSQL)
// app.post("/api/admin/login", async (req, res) => {
//   const { username, password } = req.body;

//   if (!username || !password) {
//     return res.status(400).json({ error: "Username and password required" });
//   }

//   try {
//     const trimmedUsername = username.trim();

//     const result = await pool.query(
//       "SELECT * FROM admins WHERE username = $1;",
//       [trimmedUsername]
//     );
//     const admin = result.rows[0];

//     if (!admin || !admin.password) {
//       return res.status(400).json({ error: "Invalid credentials" });
//     }

//     const isValid = bcrypt.compareSync(password.trim(), admin.password);

//     if (!isValid) {
//       return res.status(400).json({ error: "Invalid credentials" });
//     }

//     const token = jwt.sign(
//       { id: admin.id, username: admin.username },
//       JWT_SECRET,
//       { expiresIn: "2h" }
//     );

//     res.json({ token });
//   } catch (err) {
//     console.error("Login error:", err);
//     res.status(500).json({ error: err.message });
//   }
// });

// // ==========================
// // PRODUCTS ROUTES
// // ==========================

// // POST new product (Rewritten for PostgreSQL)
// app.post(
//   "/api/products",
//   authenticate,
//   upload.fields([
//     { name: "images", maxCount: 5 },
//     { name: "thumbnailImage", maxCount: 1 },
//   ]),
//   async (req, res) => {
//     const { productName, type, description, price, category } = req.body;

//     if (!productName || !price || !category)
//       return res
//         .status(400)
//         .json({ error: "Product Name, price and category required" });

//     const images =
//       req.files["images"]?.map((f) => `/uploads/${f.filename}`) || [];
//     const thumbnail = req.files["thumbnailImage"]?.[0]
//       ? `/uploads/${req.files["thumbnailImage"][0].filename}`
//       : images[0] || "";

//     try {
//       const parsedPrice = parseFloat(price);
//       if (isNaN(parsedPrice)) {
//         return res.status(400).json({ error: "Price must be a valid number." });
//       }

//       const query = `
//                 INSERT INTO products 
//                 (name, type, description, price, category, tags, exchangeable, refundable, thumbnail, images, availability)
//                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
//                 RETURNING id;
//             `;

//       const values = [
//         productName,
//         type || "general",
//         description || "",
//         parsedPrice,
//         category,
//         "[]", // Tags as JSON string in TEXT column
//         req.body.exchangeable === "1" ? 1 : 0,
//         req.body.refundable === "1" ? 1 : 0,
//         thumbnail,
//         JSON.stringify(images), // Images array stored as JSON string
//         "in stock",
//       ];

//       await pool.query(query, values);
//       res.status(201).json({ message: "Product created successfully" });
//     } catch (err) {
//       console.error("Product POST DB Error:", err);
//       res.status(500).json({ error: err.message });
//     }
//   }
// );

// // GET all products (Rewritten for PostgreSQL)
// app.get("/api/products", async (req, res) => {
//   try {
//     const result = await pool.query("SELECT * FROM products ORDER BY id DESC;");

//     const products = result.rows.map((row) => {
//       let images = [];
//       try {
//         // Ensure the images column is parsed from JSON TEXT
//         images = row.images ? JSON.parse(row.images) : [];
//       } catch (e) {
//         console.warn(`Invalid images JSON for product ${row.id}:`, row.images);
//         images = [];
//       }

//       let price = Number(row.price);
//       if (isNaN(price)) price = 0;

//       return {
//         id: row.id,
//         name: row.name || "Unnamed Product",
//         category: row.category || "Uncategorized",
//         quantity: row.quantity != null ? row.quantity : 0,
//         availability: row.availability || "In Stock",
//         images,
//         price,
//         thumbnail: row.thumbnail || "",
//       };
//     });

//     res.json(products);
//   } catch (err) {
//     console.error("Error fetching products:", err);
//     res.status(500).json({ error: "Failed to fetch products" });
//   }
// });

// // PUT update product (Rewritten for PostgreSQL)
// app.put(
//   "/api/products/:id",
//   authenticate,
//   upload.fields([
//     { name: "images", maxCount: 5 },
//     { name: "thumbnail", maxCount: 1 },
//   ]),
//   async (req, res) => {
//     const { id } = req.params;
//     const {
//       productName,
//       type,
//       description,
//       price,
//       category,
//       tags,
//       exchangeable,
//       refundable,
//     } = req.body;

//     const fields = [];
//     const values = [];
//     let paramCount = 1;

//     const addField = (fieldName, value) => {
//       fields.push(`${fieldName} = $${paramCount++}`);
//       values.push(value);
//     };

//     if (productName) addField("name", productName);
//     if (type) addField("type", type);
//     if (description) addField("description", description);
//     if (price) addField("price", parseFloat(price));
//     if (category) addField("category", category);
//     if (tags) addField("tags", tags);

//     // FIX 2: Correctly convert boolean/string checkbox values to 1 or 0 integer
//     if (exchangeable !== undefined) {
//         const val = (exchangeable === '1' || exchangeable === true) ? 1 : 0;
//         addField("exchangeable", val);
//     }
//     if (refundable !== undefined) {
//         const val = (refundable === '1' || refundable === true) ? 1 : 0;
//         addField("refundable", val);
//     }

//     if (req.files["thumbnail"]?.[0]) {
//       addField("thumbnail", `/uploads/${req.files["thumbnail"][0].filename}`);
//     }
//     if (req.files["images"]?.length > 0) {
//       const imgs = req.files["images"].map((f) => `/uploads/${f.filename}`);
//       addField("images", JSON.stringify(imgs));
//     }

//     if (fields.length === 0)
//       return res.status(400).json({ error: "No fields to update" });

//     addField("availability", "in stock"); // Adds to fields and increments paramCount

//     // FIX 1: ID parameter index calculation
//     values.push(id);
//     const idParamIndex = values.length; // The current length is the correct 1-based index for the ID

//     try {
//       const query = `UPDATE products SET ${fields.join(
//         ", "
//       )} WHERE id = $${idParamIndex};`; // Use the calculated index

//       // DEBUGGING LOGS (Remove after testing)
//       console.log("DEBUG PUT Query:", query);
//       console.log("DEBUG PUT Values:", values);

//       const result = await pool.query(query, values);

//       if (result.rowCount === 0) {
//         return res.status(404).json({ error: "Product not found" });
//       }
//       res.json({ message: "Product updated successfully" });
//     } catch (err) {
//       console.error("Product PUT DB Error:", err);
//       res.status(500).json({ error: err.message });
//     }
//   }
// );


// app.delete("/api/products/:id", authenticate, async (req, res) => {
//   try {
//     const result = await pool.query("DELETE FROM products WHERE id = $1;", [
//       req.params.id,
//     ]);

//     if (result.rowCount === 0) {
//       return res.status(404).json({ error: "Product not found" });
//     }
//     res.json({ message: "Product deleted" });
//   } catch (err) {
//     console.error("Product DELETE DB Error:", err);
//     res.status(500).json({ error: err.message });
//   }
// });

// // GET product count for debugging (Rewritten for PostgreSQL)
// app.get("/debug/product-count", async (req, res) => {
//   try {
//     const result = await pool.query("SELECT COUNT(*) AS count FROM products;");
//     const count = result.rows[0].count;

//     res.json({
//       status: "OK",
//       productCount: parseInt(count),
//       message:
//         "Data is retrieved directly from the persistent PostgreSQL database.",
//     });
//   } catch (err) {
//     console.error("Error during product count debug:", err);
//     res
//       .status(500)
//       .json({ error: "Failed to read database for count: " + err.message });
//   }
// });

// app.get("/debug/admins", async (req, res) => {
//   try {
//     const result = await pool.query("SELECT id, username FROM admins;");
//     res.json(result.rows);
//   } catch (err) {
//     console.error("Error fetching admins debug:", err);
//     res.status(500).json({ error: err.message });
//   }
// });

// // ==========================
// // START SERVER
// // ==========================
// const PORT = process.env.PORT || 5000;

// // Initialize DB, then start server
// initDb().then(() => {
//   app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
// });

import path from "path";
import express from "express";
import bodyParser from "body-parser";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cors from "cors";
import multer from "multer";
import { Pool } from 'pg';
import { v2 as cloudinary } from 'cloudinary'; // Import Cloudinary
import DataUri from 'datauri/parser.js';     // Helper for file formatting
import fs from "fs";

// --- Initialization ---
const app = express();
const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey"; // Use ENV variable for JWT

// ==========================
// POSTGRESQL CONFIGURATION
// ==========================
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    console.error("❌ FATAL: DATABASE_URL environment variable is not set.");
    process.exit(1);
}

// Create a connection pool
const pool = new Pool({
    connectionString,
    // FIX for 'self-signed certificate' errors on cloud platforms
    ssl: {
        rejectUnauthorized: false,
        checkServerIdentity: () => null, // Added for robustness against hostname mismatch
    }
});

// ==========================
// CLOUDINARY CONFIGURATION
// ==========================
if (
    !process.env.CLOUDINARY_CLOUD_NAME || 
    !process.env.CLOUDINARY_API_KEY || 
    !process.env.CLOUDINARY_API_SECRET
) {
    console.warn("⚠️ Cloudinary environment variables are missing. File uploads will fail.");
}

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const dataUri = new DataUri();

// Helper function to format multer file buffer for Cloudinary upload
const formatFile = (file) => dataUri.format(path.extname(file.originalname).toString(), file.buffer).content;

// Helper function to handle upload
const uploadToCloudinary = async (file) => {
    const fileUri = formatFile(file);
    return cloudinary.uploader.upload(fileUri, {
        folder: 'nees_products', // Customize your folder name
    });
};

// ==========================
// DB Initialization Function
// ==========================
async function initDb() {
    try {
        const client = await pool.connect();

        // 1. Create Admins Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS admins (
                id SERIAL PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL
            );
        `);

        // 2. Create Products Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS products (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                type TEXT,
                description TEXT,
                price REAL NOT NULL,
                category TEXT NOT NULL,
                tags TEXT,
                exchangeable INTEGER DEFAULT 0,
                refundable INTEGER DEFAULT 0,
                thumbnail TEXT,  -- Stores full Cloudinary URL
                images TEXT,     -- Stores JSON array of Cloudinary URLs
                availability TEXT
            );
        `);
        client.release();
        console.log("✅ PostgreSQL tables ensured.");
    } catch (err) {
        console.error("❌ Error initializing PostgreSQL database:", err);
        process.exit(1);
    }
}

// ==========================
// MULTER CONFIG (NEW: Memory Storage)
// ==========================
// We no longer need local disk storage or the '/uploads' directory logic
const upload = multer({ 
    storage: multer.memoryStorage(), // Store files in memory buffer
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit per file
});

// ==========================
// MIDDLEWARE
// ==========================
// Removed app.use("/uploads", express.static(uploadDir)); 
app.use(bodyParser.json());
app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
}));

// ==========================
// AUTH MIDDLEWARE
// ==========================
const authenticate = (req, res, next) => {
    const header = req.headers.authorization;
    if (!header) return res.status(401).json({ error: "Missing token" });

    const token = header.split(" ")[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.admin = decoded;
        next();
    } catch {
        res.status(401).json({ error: "Invalid token" });
    }
};

// ==========================
// ROOT
// ==========================
app.get("/", (req, res) => res.send("API alive with PostgreSQL and Cloudinary"));

// ==========================
// ADMIN ROUTES (PostgreSQL)
// ==========================

// REGISTER
app.post("/api/admin/register", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password)
        return res.status(400).json({ error: "Username and password required" });

    const hashed = bcrypt.hashSync(password, 10);

    try {
        const result = await pool.query(
            "INSERT INTO admins (username, password) VALUES ($1, $2) RETURNING id;",
            [username, hashed]
        );
        res.status(201).json({ message: "Admin created", id: result.rows[0].id });
    } catch (err) {
        if (err.code === '23505') { 
            res.status(400).json({ error: "Username already exists" });
        } else {
            console.error("Admin registration error:", err);
            res.status(500).json({ error: err.message });
        }
    }
});

// LOGIN
app.post("/api/admin/login", async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: "Username and password required" });
    }

    try {
        const trimmedUsername = username.trim();

        const result = await pool.query("SELECT * FROM admins WHERE username = $1;", [trimmedUsername]);
        const admin = result.rows[0];

        if (!admin || !admin.password) {
            return res.status(400).json({ error: "Invalid credentials" });
        }

        const isValid = bcrypt.compareSync(password.trim(), admin.password);

        if (!isValid) {
            return res.status(400).json({ error: "Invalid credentials" });
        }

        const token = jwt.sign(
            { id: admin.id, username: admin.username },
            JWT_SECRET,
            { expiresIn: "2h" }
        );

        res.json({ token });
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ error: err.message });
    }
});

// ==========================
// PRODUCTS ROUTES
// ==========================

// POST new product (Cloudinary)
app.post(
    "/api/products",
    authenticate,
    upload.fields([
        { name: "images", maxCount: 5 },
        { name: "thumbnailImage", maxCount: 1 },
    ]),
    async (req, res) => {
        const { productName, type, description, price, category } = req.body;

        if (!productName || !price || !category)
            return res.status(400).json({ error: "Product Name, price and category required" });

        const uploadedImages = req.files["images"] || [];
        const thumbnailFile = req.files["thumbnailImage"]?.[0];

        let thumbnailURL = "";
        let imageURLs = [];

        try {
            // 1. Upload thumbnail
            if (thumbnailFile) {
                const result = await uploadToCloudinary(thumbnailFile);
                thumbnailURL = result.secure_url;
            }

            // 2. Upload main images concurrently
            if (uploadedImages.length > 0) {
                const uploadPromises = uploadedImages.map(file => uploadToCloudinary(file));
                const results = await Promise.all(uploadPromises);
                imageURLs = results.map(result => result.secure_url);
            }

            // 3. Fallback: Use the first image if no thumbnail was explicitly provided
            if (!thumbnailURL && imageURLs.length > 0) {
                thumbnailURL = imageURLs[0];
            }

            // 4. Prepare database insertion
            const parsedPrice = parseFloat(price);
            if (isNaN(parsedPrice)) {
                return res.status(400).json({ error: "Price must be a valid number." });
            }

            const query = `
                INSERT INTO products 
                (name, type, description, price, category, tags, exchangeable, refundable, thumbnail, images, availability)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                RETURNING id;
            `;

            const values = [
                productName,
                type || "general",
                description || "",
                parsedPrice,
                category,
                "[]",
                req.body.exchangeable === '1' ? 1 : 0,
                req.body.refundable === '1' ? 1 : 0,
                thumbnailURL, // Cloudinary URL
                JSON.stringify(imageURLs), // JSON array of Cloudinary URLs
                "in stock",
            ];

            await pool.query(query, values);
            res.status(201).json({ message: "Product created successfully" });

        } catch (err) {
            console.error("Product POST DB/Cloudinary Error:", err);
            res.status(500).json({ error: "Failed to process product: " + err.message });
        }
    }
);

// GET all products (PostgreSQL)
app.get("/api/products", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM products ORDER BY id DESC;");
        
        const products = result.rows.map(row => {
            let images = [];
            try {
                images = row.images ? JSON.parse(row.images) : [];
            } catch (e) {
                images = [];
            }

            let price = Number(row.price);
            if (isNaN(price)) price = 0;

            return {
                id: row.id,
                name: row.name || "Unnamed Product",
                category: row.category || "Uncategorized",
                quantity: row.quantity != null ? row.quantity : 0,
                availability: row.availability || "In Stock",
                images,
                price,
                thumbnail: row.thumbnail || "", // This is now a full Cloudinary URL
            };
        });

        res.json(products);
    } catch (err) {
        console.error("Error fetching products:", err);
        res.status(500).json({ error: "Failed to fetch products" });
    }
});

// PUT update product (Cloudinary)
app.put(
    "/api/products/:id",
    authenticate,
    upload.fields([
        { name: "images", maxCount: 5 },
        { name: "thumbnail", maxCount: 1 },
    ]),
    async (req, res) => {
        const { id } = req.params;
        const {
            productName, type, description, price, category, tags, 
            exchangeable, refundable, // These might be '0'/'1' strings
            existingImages // Assuming client sends array of existing URLs to keep
        } = req.body;

        const fields = [];
        const values = [];
        let paramCount = 1;

        const addField = (fieldName, value) => {
            fields.push(`${fieldName} = $${paramCount++}`);
            values.push(value);
        };

        // --- File Upload Logic ---
        const uploadedImages = req.files["images"] || [];
        const thumbnailFile = req.files["thumbnail"]?.[0];
        let newThumbnailURL = null;
        let newImageURLs = [];

        try {
            // Upload new thumbnail if provided
            if (thumbnailFile) {
                const result = await uploadToCloudinary(thumbnailFile);
                newThumbnailURL = result.secure_url;
                addField("thumbnail", newThumbnailURL);
            }

            // Upload new images concurrently
            if (uploadedImages.length > 0) {
                const uploadPromises = uploadedImages.map(file => uploadToCloudinary(file));
                const results = await Promise.all(uploadPromises);
                newImageURLs = results.map(result => result.secure_url);
                
                // Combine new images with existing images (if provided)
                const finalImageURLs = existingImages ? [...JSON.parse(existingImages), ...newImageURLs] : newImageURLs;
                addField("images", JSON.stringify(finalImageURLs));
            }
        
            // --- Text Field Logic ---
            if (productName) addField("name", productName);
            if (type) addField("type", type);
            if (description) addField("description", description);
            if (price) addField("price", parseFloat(price));
            if (category) addField("category", category);
            if (tags) addField("tags", tags);

            // Correctly convert boolean/string checkbox values to 1 or 0 integer
            if (exchangeable !== undefined) {
                const val = (exchangeable === '1' || exchangeable === true) ? 1 : 0;
                addField("exchangeable", val);
            }
            if (refundable !== undefined) {
                const val = (refundable === '1' || refundable === true) ? 1 : 0;
                addField("refundable", val);
            }

            if (fields.length === 0)
                return res.status(400).json({ error: "No fields to update" });

            addField("availability", "in stock");

            values.push(id);
            const idParamIndex = values.length; 

            // --- Database Update ---
            const query = `UPDATE products SET ${fields.join(", ")} WHERE id = $${idParamIndex};`;
            const result = await pool.query(query, values);

            if (result.rowCount === 0) {
                return res.status(404).json({ error: "Product not found" });
            }
            res.json({ message: "Product updated successfully" });

        } catch (err) {
            console.error("Product PUT DB/Cloudinary Error:", err);
            res.status(500).json({ error: "Update failed: " + err.message });
        }
    }
);

// DELETE product (PostgreSQL)
app.delete("/api/products/:id", authenticate, async (req, res) => {
    try {
        const result = await pool.query("DELETE FROM products WHERE id = $1;", [req.params.id]);
        
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Product not found" });
        }
        // TODO: Optionally, implement logic here to delete files from Cloudinary
        res.json({ message: "Product deleted" });
    } catch (err) {
        console.error("Product DELETE DB Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// ==========================
// START SERVER
// ==========================
const PORT = process.env.PORT || 5000;

// Initialize DB, then start server
initDb().then(() => {
    app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
});