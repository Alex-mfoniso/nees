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
import fs from "fs";
import express from "express";
import sqlite3 from "sqlite3";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cors from "cors";
import multer from "multer";
import bodyParser from "body-parser";
import AWS from "aws-sdk";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// ====== Environment ======
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || "development";
const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

// ====== S3 Setup ======
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});
const S3_BUCKET = process.env.S3_BUCKET;

// ====== Local temp folder for uploads ======
const tempUploadFolder = "/tmp/uploads";
if (!fs.existsSync(tempUploadFolder)) fs.mkdirSync(tempUploadFolder, { recursive: true });

// ====== Middleware ======
app.use(cors({ origin: "*", methods: ["GET", "POST", "PUT", "DELETE"] }));
app.use(bodyParser.json());

// ====== SQLite DB ======
const dbPath = "/tmp/database.db";
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS products (
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
    )
  `);
});

console.log("✅ SQLite DB ready");

// ====== Multer setup ======
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, tempUploadFolder),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

// ====== Helper: upload to S3 ======
async function uploadToS3(filePath, fileName) {
  const fileContent = fs.readFileSync(filePath);
  const params = {
    Bucket: S3_BUCKET,
    Key: fileName,
    Body: fileContent,
    ACL: "public-read",
  };
  const data = await s3.upload(params).promise();
  fs.unlinkSync(filePath); // remove temp file
  return data.Location; // S3 URL
}

// ====== Auth Middleware ======
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

// ====== Routes ======
app.get("/", (req, res) => res.send("API is alive with SQLite + S3!"));

// -------- Admin --------
app.post("/api/admin/register", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: "Username and password required" });

  const hashed = bcrypt.hashSync(password, 10);

  db.run(
    "INSERT INTO admins (username, password) VALUES (?, ?)",
    [username, hashed],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Admin created", id: this.lastID });
    }
  );
});

app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body;

  db.get("SELECT * FROM admins WHERE username = ?", [username], async (err, admin) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!admin) return res.status(400).json({ error: "Invalid credentials" });

    const isValid = await bcrypt.compare(password, admin.password);
    if (!isValid) return res.status(400).json({ error: "Invalid credentials" });

    const token = jwt.sign({ id: admin.id, username: admin.username }, JWT_SECRET, { expiresIn: "2h" });
    res.json({ token });
  });
});

// -------- Products --------
app.get("/api/products", (req, res) => {
  db.all("SELECT * FROM products", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    const products = rows.map(p => ({
      ...p,
      price: Number(p.price),
      images: JSON.parse(p.images || "[]"),
    }));

    res.json(products);
  });
});

app.post("/api/products", authenticate, upload.fields([{ name: "images", maxCount: 5 }, { name: "thumbnail", maxCount: 1 }]), async (req, res) => {
  try {
    const { name, type, description, price, category } = req.body;
    if (!name || !price || !category) return res.status(400).json({ error: "Name, price, category required" });

    const uploadedImages = [];
    if (req.files["images"]) {
      for (const f of req.files["images"]) {
        uploadedImages.push(await uploadToS3(f.path, f.filename));
      }
    }

    let thumbnail = "";
    if (req.files["thumbnail"]?.[0]) {
      thumbnail = await uploadToS3(req.files["thumbnail"][0].path, req.files["thumbnail"][0].filename);
    } else if (uploadedImages.length > 0) {
      thumbnail = uploadedImages[0];
    }

    db.run(
      `INSERT INTO products 
      (name, type, description, price, category, tags, exchangeable, refundable, thumbnail, images, availability)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, type || "general", description || "", price, category, "[]", 0, 0, thumbnail, JSON.stringify(uploadedImages), "in stock"],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID });
      }
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/products/:id", authenticate, upload.fields([{ name: "images", maxCount: 5 }, { name: "thumbnail", maxCount: 1 }]), async (req, res) => {
  const { id } = req.params;
  const { name, price, category } = req.body;

  db.get("SELECT * FROM products WHERE id = ?", [id], async (err, product) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!product) return res.status(404).json({ error: "Product not found" });

    const updates = [];
    const values = [];

    if (name) { updates.push("name = ?"); values.push(name); }
    if (price) { updates.push("price = ?"); values.push(price); }
    if (category) { updates.push("category = ?"); values.push(category); }

    if (req.files["thumbnail"]?.[0]) {
      const thumbUrl = await uploadToS3(req.files["thumbnail"][0].path, req.files["thumbnail"][0].filename);
      updates.push("thumbnail = ?"); values.push(thumbUrl);
    }

    if (req.files["images"]?.length > 0) {
      const imgs = [];
      for (const f of req.files["images"]) imgs.push(await uploadToS3(f.path, f.filename));
      updates.push("images = ?"); values.push(JSON.stringify(imgs));
    }

    if (updates.length === 0) return res.status(400).json({ error: "No fields to update" });

    values.push(id);
    db.run(`UPDATE products SET ${updates.join(", ")} WHERE id = ?`, values, function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Product updated" });
    });
  });
});

app.delete("/api/products/:id", authenticate, (req, res) => {
  db.run("DELETE FROM products WHERE id = ?", [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Product deleted" });
  });
});

// ====== Start Server ======
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
