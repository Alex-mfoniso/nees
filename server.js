// import path from "path"
// import express from "express"
// import mysql from "mysql2/promise"
// import bodyParser from "body-parser"
// import bcrypt from "bcryptjs"
// import jwt from "jsonwebtoken"
// import cors from "cors"
// import dotenv from "dotenv"
// import multer from "multer"

// dotenv.config()
// const app = express()

// // Static uploads folder
// app.use("/uploads", express.static(path.join(process.cwd(), "uploads")))

// // CORS
// app.use(
//   cors({
//     origin: "*",
//     methods: ["GET", "POST", "DELETE", "PUT"]
//   })
// )

// app.use(bodyParser.json())

// // ==============================
// // DATABASE
// // ==============================
// const db = await mysql.createConnection({
//   host: process.env.DB_HOST,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASS,
//   database: process.env.DB_NAME
// })

// // Some environments require explicit connect()
// try {
//   await db.connect()
//   console.log("✅ Database connected")
// } catch (err) {
//   console.error("❌ DB connection failed:", err.message)
// }

// // ==============================
// // JWT
// // ==============================
// const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey"

// // ==============================
// // MULTER
// // ==============================
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => cb(null, "./uploads/"),
//   filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
// })
// const upload = multer({ storage })

// // ==============================
// // AUTH MIDDLEWARE
// // ==============================
// const authenticate = (req, res, next) => {
//   const header = req.headers.authorization
//   if (!header) return res.status(401).json({ error: "Missing token" })

//   const token = header.split(" ")[1]
//   try {
//     const decoded = jwt.verify(token, JWT_SECRET)
//     req.admin = decoded
//     next()
//   } catch {
//     res.status(401).json({ error: "Invalid token" })
//   }
// }

// // ==============================
// // ROOT ROUTE (IMPORTANT FOR RENDER)
// // ==============================
// app.get("/", (req, res) => {
//   res.send("API is alive")
// })

// // ==============================
// // ADMIN
// // ==============================
// app.post("/api/admin/register", async (req, res) => {
//   const { username, password } = req.body
//   if (!username || !password)
//     return res.status(400).json({ error: "Username and password required" })

//   const hashed = await bcrypt.hash(password, 10)

//   try {
//     const [result] = await db.execute(
//       "INSERT INTO admins (username, password) VALUES (?, ?)",
//       [username, hashed]
//     )
//     res.json({ message: "Admin created", id: result.insertId })
//   } catch (err) {
//     res.status(500).json({ error: err.message })
//   }
// })

// app.post("/api/admin/login", async (req, res) => {
//   const { username, password } = req.body
//   if (!username || !password)
//     return res.status(400).json({ error: "Username and password required" })

//   try {
//     const [rows] = await db.execute(
//       "SELECT * FROM admins WHERE username = ?",
//       [username]
//     )

//     if (rows.length === 0)
//       return res.status(400).json({ error: "Invalid credentials" })

//     const admin = rows[0]
//     const isValid = await bcrypt.compare(password, admin.password)
//     if (!isValid) return res.status(400).json({ error: "Invalid credentials" })

//     const token = jwt.sign(
//       { id: admin.id, username: admin.username },
//       JWT_SECRET,
//       { expiresIn: "2h" }
//     )

//     res.json({ token })
//   } catch (err) {
//     res.status(500).json({ error: err.message })
//   }
// })

// // ==============================
// // PRODUCTS
// // ==============================
// app.get("/api/products", async (req, res) => {
//   try {
//     const [rows] = await db.execute("SELECT * FROM products")

//     const products = rows.map(p => ({
//       ...p,
//       price: Number(p.price),
//       images: JSON.parse(p.images || "[]"),
//       availability: "in stock"
//     }))

//     res.json(products)
//   } catch (err) {
//     res.status(500).json({ error: err.message })
//   }
// })

// app.post(
//   "/api/products",
//   authenticate,
//   upload.fields([
//     { name: "images", maxCount: 5 },
//     { name: "thumbnail", maxCount: 1 }
//   ]),
//   async (req, res) => {
//     try {
//       const { name, type, description, price, category } = req.body

//       if (!name || !price || !category)
//         return res
//           .status(400)
//           .json({ error: "Name, price and category are required" })

//       let images = []
//       if (req.files["images"]) {
//         images = req.files["images"].map(f => `/uploads/${f.filename}`)
//       }
//       const imagesJSON = JSON.stringify(images)

//       let thumbnail = ""
//       if (req.files["thumbnail"]?.[0]) {
//         thumbnail = `/uploads/${req.files["thumbnail"][0].filename}`
//       } else if (images.length > 0) {
//         thumbnail = images[0]
//       }

//       const [result] = await db.execute(
//         `INSERT INTO products (name, type, description, price, category, tags, exchangeable, refundable, thumbnail, images, availability)
//          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//         [
//           name,
//           type || "general",
//           description || "",
//           price,
//           category,
//           "[]",
//           0,
//           0,
//           thumbnail,
//           imagesJSON,
//           "in stock"
//         ]
//       )

//       res.json({ id: result.insertId })
//     } catch (err) {
//       res.status(500).json({ error: err.message })
//     }
//   }
// )

// app.put(
//   "/api/products/:id",
//   authenticate,
//   upload.fields([
//     { name: "images", maxCount: 5 },
//     { name: "thumbnail", maxCount: 1 }
//   ]),
//   async (req, res) => {
//     try {
//       const { id } = req.params
//       const { name, price } = req.body

//       const fields = []
//       const values = []

//       if (name) {
//         fields.push("name = ?")
//         values.push(name)
//       }

//       if (price) {
//         fields.push("price = ?")
//         values.push(price)
//       }

//       fields.push("availability = ?")
//       values.push("in stock")

//       if (req.files["thumbnail"]?.[0]) {
//         fields.push("thumbnail = ?")
//         values.push(`/uploads/${req.files["thumbnail"][0].filename}`)
//       }

//       if (req.files["images"]?.length > 0) {
//         const imgs = req.files["images"].map(f => `/uploads/${f.filename}`)
//         fields.push("images = ?")
//         values.push(JSON.stringify(imgs))
//       }

//       if (fields.length === 0)
//         return res.status(400).json({ error: "No fields to update" })

//       values.push(id)
//       const sql = `UPDATE products SET ${fields.join(", ")} WHERE id = ?`
//       await db.execute(sql, values)

//       res.json({ message: "Product updated successfully" })
//     } catch (err) {
//       res.status(500).json({ error: err.message })
//     }
//   }
// )

// app.delete("/api/products/:id", authenticate, async (req, res) => {
//   try {
//     const { id } = req.params
//     await db.execute("DELETE FROM products WHERE id = ?", [id])
//     res.json({ message: "Product deleted successfully" })
//   } catch (err) {
//     res.status(500).json({ error: err.message })
//   }
// })

// // ==============================
// // START SERVER (RENDER REQUIRED FORMAT)
// // ==============================
// const PORT = process.env.PORT || 5000

// app.listen(PORT, () => {
//   console.log("✅ Server running on port " + PORT)
// })


import path from "path";
import express from "express";
import bodyParser from "body-parser";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cors from "cors";
import multer from "multer";
import initSqlJs from "sql.js";
import fs from "fs";

const app = express();

// ==========================
// MIDDLEWARE
// ==========================
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
app.use(bodyParser.json());
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);

// ==========================
// JWT CONFIG
// ==========================
const JWT_SECRET = "supersecretkey";

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
// MULTER CONFIG
// ==========================
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "./uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

// ==========================
// INIT SQLITE
// ==========================
const SQL = await initSqlJs({
  locateFile: file => path.join(process.cwd(), "node_modules/sql.js/dist/", file),
});

const DB_FILE = "./database.sqlite";

// Load or create database
let db;
if (fs.existsSync(DB_FILE)) {
  const fileBuffer = fs.readFileSync(DB_FILE);
  db = new SQL.Database(fileBuffer);
} else {
  db = new SQL.Database();
  db.run(`
    CREATE TABLE admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT
    );
  `);
  db.run(`
    CREATE TABLE products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      type TEXT,
      description TEXT,
      price REAL,
      category TEXT,
      tags TEXT,
      exchangeable INTEGER,
      refundable INTEGER,
      thumbnail TEXT,
      images TEXT,
      availability TEXT
    );
  `);
  fs.writeFileSync(DB_FILE, Buffer.from(db.export()));
}

const saveDB = () => {
  fs.writeFileSync(DB_FILE, Buffer.from(db.export()));
};

// ==========================
// ROOT
// ==========================
app.get("/", (req, res) => res.send("API alive with sql.js"));

// ==========================
// ADMIN ROUTES
// ==========================
app.post("/api/admin/register", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Username and password required" });

  const hashed = bcrypt.hashSync(password, 10);

  try {
    db.run("INSERT INTO admins (username, password) VALUES (?, ?);", [username, hashed]);
    saveDB();
    res.json({ message: "Admin created" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body;
  try {
    const stmt = db.prepare("SELECT * FROM admins WHERE username = ?;");
    stmt.bind([username]);
    const admin = stmt.getAsObject();
    stmt.free();

    if (!admin.id) return res.status(400).json({ error: "Invalid credentials" });

    const isValid = bcrypt.compareSync(password, admin.password);
    if (!isValid) return res.status(400).json({ error: "Invalid credentials" });

    const token = jwt.sign({ id: admin.id, username: admin.username }, JWT_SECRET, { expiresIn: "2h" });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================
// PRODUCTS ROUTES
// ==========================

// GET all products
app.get("/api/products", (req, res) => {
  try {
    const stmt = db.prepare("SELECT * FROM products;");
    const products = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      row.images = JSON.parse(row.images || "[]");
      row.price = Number(row.price);
      products.push(row);
    }
    stmt.free();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST new product
app.post(
  "/api/products",
  authenticate,
  upload.fields([
    { name: "images", maxCount: 5 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  (req, res) => {
    const { name, type, description, price, category } = req.body;
    if (!name || !price || !category) return res.status(400).json({ error: "Name, price and category required" });

    const images = req.files["images"]?.map(f => `/uploads/${f.filename}`) || [];
    const thumbnail =
      req.files["thumbnail"]?.[0] ? `/uploads/${req.files["thumbnail"][0].filename}` : images[0] || "";

    try {
      db.run(
        `INSERT INTO products
         (name, type, description, price, category, tags, exchangeable, refundable, thumbnail, images, availability)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [name, type || "general", description || "", price, category, "[]", 0, 0, thumbnail, JSON.stringify(images), "in stock"]
      );
      saveDB();
      res.json({ message: "Product created" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// PUT update product
app.put(
  "/api/products/:id",
  authenticate,
  upload.fields([
    { name: "images", maxCount: 5 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  (req, res) => {
    const { id } = req.params;
    const { name, type, description, price, category, tags, exchangeable, refundable } = req.body;

    const fields = [];
    const values = [];

    if (name) { fields.push("name = ?"); values.push(name); }
    if (type) { fields.push("type = ?"); values.push(type); }
    if (description) { fields.push("description = ?"); values.push(description); }
    if (price) { fields.push("price = ?"); values.push(price); }
    if (category) { fields.push("category = ?"); values.push(category); }
    if (tags) { fields.push("tags = ?"); values.push(tags); }
    if (exchangeable !== undefined) { fields.push("exchangeable = ?"); values.push(exchangeable); }
    if (refundable !== undefined) { fields.push("refundable = ?"); values.push(refundable); }

    if (req.files["thumbnail"]?.[0]) {
      fields.push("thumbnail = ?");
      values.push(`/uploads/${req.files["thumbnail"][0].filename}`);
    }
    if (req.files["images"]?.length > 0) {
      const imgs = req.files["images"].map(f => `/uploads/${f.filename}`);
      fields.push("images = ?");
      values.push(JSON.stringify(imgs));
    }

    if (fields.length === 0) return res.status(400).json({ error: "No fields to update" });

    fields.push("availability = ?");
    values.push("in stock");

    values.push(id);

    try {
      db.run(`UPDATE products SET ${fields.join(", ")} WHERE id = ?;`, values);
      saveDB();
      res.json({ message: "Product updated successfully" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// DELETE product
app.delete("/api/products/:id", authenticate, (req, res) => {
  try {
    db.run("DELETE FROM products WHERE id = ?;", [req.params.id]);
    saveDB();
    res.json({ message: "Product deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================
// START SERVER
// ==========================
const PORT = 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
