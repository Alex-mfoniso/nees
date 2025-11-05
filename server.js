// import path from "path";
// import express from "express";
// import bodyParser from "body-parser";
// import bcrypt from "bcryptjs";
// import jwt from "jsonwebtoken";
// import cors from "cors";
// import multer from "multer";
// import initSqlJs from "sql.js";
// import fs from "fs";

// // --- Initialization ---
// const app = express();
// const JWT_SECRET = "supersecretkey";
// const DB_FILE = "./database.sqlite";

// // ==========================
// // DIRECTORY SETUP
// // ==========================
// // Ensure the 'uploads' directory exists
// const uploadDir = path.join(process.cwd(), 'uploads');
// if (!fs.existsSync(uploadDir)) {
//     fs.mkdirSync(uploadDir, { recursive: true });
// }

// // ==========================
// // MULTER CONFIG (FIXED)
// // ==========================
// const storage = multer.diskStorage({
//     destination: (req, file, cb) => cb(null, uploadDir), // Use the full path
//     filename: (req, file, cb) => {
//         // Create a unique filename
//         const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
//         const extension = path.extname(file.originalname);
//         cb(null, file.fieldname + '-' + uniqueSuffix + extension);
//     },
// });
// const upload = multer({ storage });

// // ==========================
// // INIT SQLITE (ASYNC)
// // ==========================
// // Load or create database
// let db;
// try {
//     const SQL = await initSqlJs({
//         locateFile: (file) =>
//             path.join(process.cwd(), "node_modules/sql.js/dist/", file),
//     });

//     if (fs.existsSync(DB_FILE)) {
//         const fileBuffer = fs.readFileSync(DB_FILE);
//         db = new SQL.Database(fileBuffer);
//     } else {
//         db = new SQL.Database();

//         // Create tables
//         db.run(`
//             CREATE TABLE admins (
//                 id INTEGER PRIMARY KEY AUTOINCREMENT,
//                 username TEXT UNIQUE,
//                 password TEXT
//             );
//         `);

//         db.run(`
//             CREATE TABLE IF NOT EXISTS products (
//                 id INTEGER PRIMARY KEY AUTOINCREMENT,
//                 name TEXT,
//                 type TEXT,
//                 description TEXT,
//                 price REAL,
//                 category TEXT,
//                 tags TEXT,
//                 exchangeable INTEGER,
//                 refundable INTEGER,
//                 thumbnail TEXT,
//                 images TEXT,
//                 availability TEXT
//             );
//         `);
//         fs.writeFileSync(DB_FILE, Buffer.from(db.export()));
//     }
// } catch (error) {
//     console.error("Failed to initialize SQLite database:", error);
//     process.exit(1);
// }

// // Save changes helper
// const saveDB = () => {
//     try {
//         fs.writeFileSync(DB_FILE, Buffer.from(db.export()));
//     } catch (error) {
//         console.error("Failed to save database to disk:", error);
//     }
// }

// // ==========================
// // MIDDLEWARE
// // ==========================
// app.use("/uploads", express.static(uploadDir));
// app.use(bodyParser.json());
// app.use(
//     cors({
//         origin: "*",
//         methods: ["GET", "POST", "PUT", "DELETE"],
//     })
// );

// // ==========================
// // AUTH MIDDLEWARE
// // ==========================
// const authenticate = (req, res, next) => {
//     const header = req.headers.authorization;
//     if (!header) return res.status(401).json({ error: "Missing token" });

//     const token = header.split(" ")[1];
//     try {
//         const decoded = jwt.verify(token, JWT_SECRET);
//         req.admin = decoded;
//         next();
//     } catch {
//         res.status(401).json({ error: "Invalid token" });
//     }
// };

// // ==========================
// // ROOT
// // ==========================
// app.get("/", (req, res) => res.send("API alive with sql.js"));

// // ==========================
// // ADMIN ROUTES (REGISTER / LOGIN)
// // ==========================
// // REGISTER
// app.post("/api/admin/register", (req, res) => {
//     const { username, password } = req.body;
//     if (!username || !password)
//         return res.status(400).json({ error: "Username and password required" });

//     const hashed = bcrypt.hashSync(password, 10);

//     try {
//         db.run("INSERT INTO admins (username, password) VALUES (?, ?);", [
//             username,
//             hashed,
//         ]);
//         const stmt = db.prepare("SELECT last_insert_rowid() as id;");
//         stmt.step();
//         const lastId = stmt.getAsObject().id;
//         stmt.free();

//         saveDB();
//         res.json({ message: "Admin created", id: lastId });
//     } catch (err) {
//         if (err.message.includes("UNIQUE")) {
//             res.status(400).json({ error: "Username already exists" });
//         } else {
//             res.status(500).json({ error: err.message });
//         }
//     }
// });

// // LOGIN
// app.post("/api/admin/login", (req, res) => {
//     const { username, password } = req.body;

//     if (!username || !password) {
//         return res.status(400).json({ error: "Username and password required" });
//     }

//     try {
//         const trimmedUsername = username.trim();
//         const trimmedPassword = password.trim();

//         const stmt = db.prepare("SELECT * FROM admins WHERE username = ?;");
//         stmt.bind([trimmedUsername]);

//         let admin = null;
//         if (stmt.step()) {
//             admin = stmt.getAsObject();
//         }
//         stmt.free();

//         if (!admin || !admin.password) {
//             return res.status(400).json({ error: "Invalid credentials" });
//         }

//         const isValid = bcrypt.compareSync(trimmedPassword, admin.password);

//         if (!isValid) {
//             return res.status(400).json({ error: "Invalid credentials" });
//         }

//         const token = jwt.sign(
//             { id: admin.id, username: admin.username },
//             JWT_SECRET,
//             { expiresIn: "2h" }
//         );

//         res.json({ token });
//     } catch (err) {
//         console.error("Login error:", err);
//         res.status(500).json({ error: err.message });
//     }
// });

// // ==========================
// // PRODUCTS ROUTES
// // ==========================

// // POST new product (FIXED)
// app.post(
//     "/api/products",
//     authenticate,
//     upload.fields([
//         { name: "images", maxCount: 5 },
//         { name: "thumbnailImage", maxCount: 1 }, // Matches client-side HTML input name
//     ]),
//     (req, res) => {
//         // Use client-side field names
//         const { productName, type, description, price, category } = req.body;

//         // Server validation
//         if (!productName || !price || !category)
//             return res
//                 .status(400)
//                 .json({ error: "Product Name, price and category required" });

//         // Handle files
//         const images =
//             req.files["images"]?.map((f) => `/uploads/${f.filename}`) || [];

//         const thumbnail = req.files["thumbnailImage"]?.[0]
//             ? `/uploads/${req.files["thumbnailImage"][0].filename}`
//             : images[0] || ""; // Fallback to first image

//         try {
//             // Prepare values for SQL insertion
//             const values = [
//                 productName, // name (productName from client)
//                 type || "general",
//                 description || "",
//                 parseFloat(price),
//                 category,
//                 "[]", // tags
//                 req.body.exchangeable === '1' ? 1 : 0, // exchangeable (must be a checkbox on the form)
//                 req.body.refundable === '1' ? 1 : 0,  // refundable (must be a checkbox on the form)
//                 thumbnail,
//                 JSON.stringify(images),
//                 "in stock", // availability
//             ];

//             db.run(
//                 `INSERT INTO products
//                 (name, type, description, price, category, tags, exchangeable, refundable, thumbnail, images, availability)
//                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
//                 values
//             );
//             saveDB();
//             res.status(201).json({ message: "Product created successfully" });
//         } catch (err) {
//             console.error("Product POST DB Error:", err);
//             res.status(500).json({ error: err.message });
//         }
//     }
// );

// // GET all products (kept as is)
// app.get("/api/products", (req, res) => {
//     try {
//         const stmt = db.prepare("SELECT * FROM products;");
//         const products = [];

//         for (const row of stmt.iterate()) {
//             let images = [];
//             try {
//                 images = row.images ? JSON.parse(row.images) : [];
//             } catch (e) {
//                 console.warn(`Invalid images JSON for product ${row.id}:`, row.images);
//                 images = [];
//             }

//             let price = Number(row.price);
//             if (isNaN(price)) {
//                 console.warn(`Invalid price for product ${row.id}:`, row.price);
//                 price = 0;
//             }

//             products.push({
//                 id: row.id,
//                 name: row.name || "Unnamed Product",
//                 category: row.category || "Uncategorized",
//                 quantity: row.quantity != null ? row.quantity : 0,
//                 availability: row.availability || "In Stock",
//                 images,
//                 price,
//                 thumbnail: row.thumbnail || "",
//             });
//         }

//         stmt.free();

//         // Return products or dummy data if empty/error
//         if (products.length === 0) {
//             // Dummy data removed for brevity, assuming real products are intended
//             return res.json([]);
//         }

//         res.json(products);
//     } catch (err) {
//         console.error("Error fetching products:", err);
//         // Return error status instead of dummy data on real error
//         res.status(500).json({ error: "Failed to fetch products" });
//     }
// });

// // PUT update product (minor fix to field names if used in client)
// app.put(
//     "/api/products/:id",
//     authenticate,
//     upload.fields([
//         { name: "images", maxCount: 5 },
//         { name: "thumbnail", maxCount: 1 },
//     ]),
//     (req, res) => {
//         const { id } = req.params;
//         const {
//             productName, // Use productName from client
//             type,
//             description,
//             price,
//             category,
//             tags,
//             exchangeable,
//             refundable,
//         } = req.body;

//         const fields = [];
//         const values = [];

//         if (productName) { // Use productName
//             fields.push("name = ?");
//             values.push(productName);
//         }
//         if (type) {
//             fields.push("type = ?");
//             values.push(type);
//         }
//         if (description) {
//             fields.push("description = ?");
//             values.push(description);
//         }
//         if (price) {
//             fields.push("price = ?");
//             values.push(price);
//         }
//         if (category) {
//             fields.push("category = ?");
//             values.push(category);
//         }
//         if (tags) {
//             fields.push("tags = ?");
//             values.push(tags);
//         }
//         if (exchangeable !== undefined) {
//             fields.push("exchangeable = ?");
//             values.push(exchangeable);
//         }
//         if (refundable !== undefined) {
//             fields.push("refundable = ?");
//             values.push(refundable);
//         }

//         if (req.files["thumbnail"]?.[0]) {
//             fields.push("thumbnail = ?");
//             values.push(`/uploads/${req.files["thumbnail"][0].filename}`);
//         }
//         if (req.files["images"]?.length > 0) {
//             const imgs = req.files["images"].map((f) => `/uploads/${f.filename}`);
//             fields.push("images = ?");
//             values.push(JSON.stringify(imgs));
//         }

//         if (fields.length === 0)
//             return res.status(400).json({ error: "No fields to update" });

//         fields.push("availability = ?");
//         values.push("in stock");

//         values.push(id);

//         try {
//             db.run(`UPDATE products SET ${fields.join(", ")} WHERE id = ?;`, values);
//             saveDB();
//             res.json({ message: "Product updated successfully" });
//         } catch (err) {
//             res.status(500).json({ error: err.message });
//         }
//     }
// );

// // DELETE product (kept as is)
// app.delete("/api/products/:id", authenticate, (req, res) => {
//     try {
//         db.run("DELETE FROM products WHERE id = ?;", [req.params.id]);
//         saveDB();
//         res.json({ message: "Product deleted" });
//     } catch (err) {
//         res.status(500).json({ error: err.message });
//     }
// });

// // GET product count for debugging
// app.get("/debug/product-count", (req, res) => {
//     try {
//         const stmt = db.prepare("SELECT COUNT(*) AS count FROM products;");
//         stmt.step();
//         const result = stmt.getAsObject();
//         stmt.free();

//         // Check if the file timestamp reflects the last save time
//         let dbFileStats = null;
//         try {
//             dbFileStats = fs.statSync(DB_FILE);
//         } catch (e) {
//             // File might not exist yet if the server just started
//         }

//         res.json({
//             status: "OK",
//             productCount: result.count,
//             dbFileExists: !!dbFileStats,
//             dbLastModified: dbFileStats ? dbFileStats.mtime.toISOString() : "N/A",
//             message: "Check if 'productCount' increments after a successful POST. If it resets to 0 after server restart/deploy, your database persistence is the issue.",
//         });
//     } catch (err) {
//         console.error("Error during product count debug:", err);
//         res.status(500).json({ error: "Failed to read database for count: " + err.message });
//     }
// });

// app.get("/debug/admins", (req, res) => {
//     const stmt = db.prepare("SELECT * FROM admins;");
//     const rows = [];
//     while (stmt.step()) rows.push(stmt.getAsObject());
//     res.json(rows);
// });

// // ==========================
// // START SERVER
// // ==========================
// const PORT = 5000;
// app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));

import path from "path";
import express from "express";
import bodyParser from "body-parser";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cors from "cors";
import multer from "multer";
import { Pool } from "pg"; // <-- NEW: Import PostgreSQL Pool
import fs from "fs";
// import initSqlJs from "sql.js"; // <-- REMOVE: No longer needed

// --- Initialization ---
const app = express();
const JWT_SECRET = "supersecretkey";

// ==========================
// POSTGRESQL CONFIGURATION
// ==========================
// Use a persistent connection URL from your hosting environment (e.g., Render)
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("❌ FATAL: DATABASE_URL environment variable is not set.");
  process.exit(1);
}

// Create a connection pool (recommended for web servers)
// Create a connection pool
const pool = new Pool({
  connectionString,
  // ADD/UPDATE THIS SECTION:
  ssl: {
    // This tells Node.js to accept the self-signed certificate
    rejectUnauthorized: false,
    checkServerIdentity: () => null,
  },
});

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
                thumbnail TEXT,
                images TEXT,
                availability TEXT
            );
        `);
    client.release();
    console.log("✅ PostgreSQL tables ensured.");
  } catch (err) {
    console.error("❌ Error initializing PostgreSQL database:", err);
    // It's crucial to exit if the DB can't be reached
    process.exit(1);
  }
}

// ==========================
// DIRECTORY SETUP (Kept for Multer/Images)
// ==========================
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ==========================
// MULTER CONFIG (Kept as is)
// ==========================
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const extension = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + extension);
  },
});
const upload = multer({ storage });

// ==========================
// MIDDLEWARE (Kept as is)
// ==========================
app.use("/uploads", express.static(uploadDir));
app.use(bodyParser.json());
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);

// ==========================
// AUTH MIDDLEWARE (Kept as is)
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
app.get("/", (req, res) => res.send("API alive with PostgreSQL"));

// ==========================
// ADMIN ROUTES
// ==========================

// REGISTER (Rewritten for PostgreSQL)
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
    if (err.code === "23505") {
      // PostgreSQL unique violation error code
      res.status(400).json({ error: "Username already exists" });
    } else {
      console.error("Admin registration error:", err);
      res.status(500).json({ error: err.message });
    }
  }
});

// LOGIN (Rewritten for PostgreSQL)
app.post("/api/admin/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required" });
  }

  try {
    const trimmedUsername = username.trim();

    const result = await pool.query(
      "SELECT * FROM admins WHERE username = $1;",
      [trimmedUsername]
    );
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

// POST new product (Rewritten for PostgreSQL)
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
      return res
        .status(400)
        .json({ error: "Product Name, price and category required" });

    const images =
      req.files["images"]?.map((f) => `/uploads/${f.filename}`) || [];
    const thumbnail = req.files["thumbnailImage"]?.[0]
      ? `/uploads/${req.files["thumbnailImage"][0].filename}`
      : images[0] || "";

    try {
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
        "[]", // Tags as JSON string in TEXT column
        req.body.exchangeable === "1" ? 1 : 0,
        req.body.refundable === "1" ? 1 : 0,
        thumbnail,
        JSON.stringify(images), // Images array stored as JSON string
        "in stock",
      ];

      await pool.query(query, values);
      res.status(201).json({ message: "Product created successfully" });
    } catch (err) {
      console.error("Product POST DB Error:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

// GET all products (Rewritten for PostgreSQL)
app.get("/api/products", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM products ORDER BY id DESC;");

    const products = result.rows.map((row) => {
      let images = [];
      try {
        // Ensure the images column is parsed from JSON TEXT
        images = row.images ? JSON.parse(row.images) : [];
      } catch (e) {
        console.warn(`Invalid images JSON for product ${row.id}:`, row.images);
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
        thumbnail: row.thumbnail || "",
      };
    });

    res.json(products);
  } catch (err) {
    console.error("Error fetching products:", err);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// PUT update product (Rewritten for PostgreSQL)
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
      productName,
      type,
      description,
      price,
      category,
      tags,
      exchangeable,
      refundable,
    } = req.body;

    const fields = [];
    const values = [];
    let paramCount = 1;

    const addField = (fieldName, value) => {
      fields.push(`${fieldName} = $${paramCount++}`);
      values.push(value);
    };

    if (productName) addField("name", productName);
    if (type) addField("type", type);
    if (description) addField("description", description);
    if (price) addField("price", parseFloat(price));
    if (category) addField("category", category);
    if (tags) addField("tags", tags);
    if (exchangeable !== undefined) addField("exchangeable", exchangeable);
    if (refundable !== undefined) addField("refundable", refundable);

    if (req.files["thumbnail"]?.[0]) {
      addField("thumbnail", `/uploads/${req.files["thumbnail"][0].filename}`);
    }
    if (req.files["images"]?.length > 0) {
      const imgs = req.files["images"].map((f) => `/uploads/${f.filename}`);
      addField("images", JSON.stringify(imgs));
    }

    if (fields.length === 0)
      return res.status(400).json({ error: "No fields to update" });

    addField("availability", "in stock"); // Always update status on change

    values.push(id); // ID is the last parameter

    try {
      const query = `UPDATE products SET ${fields.join(
        ", "
      )} WHERE id = $${paramCount};`;
      const result = await pool.query(query, values);

      if (result.rowCount === 0) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json({ message: "Product updated successfully" });
    } catch (err) {
      console.error("Product PUT DB Error:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

// DELETE product (Rewritten for PostgreSQL)
app.delete("/api/products/:id", authenticate, async (req, res) => {
  try {
    const result = await pool.query("DELETE FROM products WHERE id = $1;", [
      req.params.id,
    ]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.json({ message: "Product deleted" });
  } catch (err) {
    console.error("Product DELETE DB Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET product count for debugging (Rewritten for PostgreSQL)
app.get("/debug/product-count", async (req, res) => {
  try {
    const result = await pool.query("SELECT COUNT(*) AS count FROM products;");
    const count = result.rows[0].count;

    res.json({
      status: "OK",
      productCount: parseInt(count),
      message:
        "Data is retrieved directly from the persistent PostgreSQL database.",
    });
  } catch (err) {
    console.error("Error during product count debug:", err);
    res
      .status(500)
      .json({ error: "Failed to read database for count: " + err.message });
  }
});

app.get("/debug/admins", async (req, res) => {
  try {
    const result = await pool.query("SELECT id, username FROM admins;");
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching admins debug:", err);
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
