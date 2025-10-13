import path from "path"
import express from "express"
import mysql from "mysql2/promise"
import bodyParser from "body-parser"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import cors from "cors"
import dotenv from "dotenv"
import multer from "multer"

dotenv.config()
const app = express()

// Serve uploaded images
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")))

// Enable CORS
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "DELETE", "PUT"],
  })
)

//

app.use(bodyParser.json())

// ===== Database Connection =====
const db = await mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
})

// ===== JWT Secret =====
const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey"

// ===== Multer Setup for File Uploads =====
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "./uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
})
const upload = multer({ storage })

// ============================
// ===== ADMIN ENDPOINTS =====
// ============================

// Admin Registration
app.post("/api/admin/register", async (req, res) => {
  const { username, password } = req.body
  if (!username || !password)
    return res.status(400).json({ error: "Username and password required" })

  const hashedPassword = await bcrypt.hash(password, 10)

  try {
    const [result] = await db.execute(
      "INSERT INTO admins (username, password) VALUES (?, ?)",
      [username, hashedPassword]
    )
    res.json({ message: "Admin created", id: result.insertId })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Admin Login
app.post("/api/admin/login", async (req, res) => {
  const { username, password } = req.body
  if (!username || !password)
    return res.status(400).json({ error: "Username and password required" })

  try {
    const [rows] = await db.execute("SELECT * FROM admins WHERE username = ?", [
      username,
    ])
    if (rows.length === 0)
      return res.status(400).json({ error: "Invalid credentials" })

    const admin = rows[0]
    const isValid = await bcrypt.compare(password, admin.password)
    if (!isValid) return res.status(400).json({ error: "Invalid credentials" })

    const token = jwt.sign(
      { id: admin.id, username: admin.username },
      JWT_SECRET,
      { expiresIn: "2h" }
    )
    res.json({ token })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ==============================
// ===== AUTH MIDDLEWARE =======
// ==============================
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization
  if (!authHeader) return res.status(401).json({ error: "Missing token" })

  const token = authHeader.split(" ")[1]
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.admin = decoded
    next()
  } catch {
    res.status(401).json({ error: "Invalid token" })
  }
}

// ============================
// ===== PRODUCT ROUTES ======
// ============================

// Public — Get all products
app.get("/api/products", async (req, res) => {
  try {
    const [rows] = await db.execute("SELECT * FROM products")

    const products = rows.map((p) => ({
      ...p,
      price: Number(p.price),
      images: JSON.parse(p.images || "[]"),
      availability: "in stock", // enforce always in stock
    }))

    res.json(products)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// Protected — Add new product
app.post(
  "/api/products",
  authenticate,
  upload.fields([
    { name: "images", maxCount: 5 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { name, type, description, price, category } = req.body

      if (!name || !price || !category) {
        return res
          .status(400)
          .json({ error: "Name, price, and category are required" })
      }

      const tagsJSON = "[]"
      const exchangeableBool = 0
      const refundableBool = 0
      const availability = "in stock" // always in stock

      let images = []
      if (req.files["images"]) {
        images = req.files["images"].map((f) => `/uploads/${f.filename}`)
      }
      const imagesJSON = JSON.stringify(images)

      let thumbnail = ""
      if (req.files["thumbnail"] && req.files["thumbnail"][0]) {
        thumbnail = `/uploads/${req.files["thumbnail"][0].filename}`
      } else if (images.length > 0) {
        thumbnail = images[0]
      }

      const [result] = await db.execute(
        `INSERT INTO products (name, type, description, price, category, tags, exchangeable, refundable, thumbnail, images, availability)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          name,
          type || "general",
          description || "",
          price,
          category,
          tagsJSON,
          exchangeableBool,
          refundableBool,
          thumbnail,
          imagesJSON,
          availability,
        ]
      )

      res.json({ id: result.insertId })
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: err.message })
    }
  }
)

// Protected — Update product
app.put(
  "/api/products/:id",
  authenticate,
  upload.fields([
    { name: "images", maxCount: 5 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { id } = req.params
      const { name, price } = req.body // remove quantity and availability from body

      const fields = []
      const values = []

      if (name) {
        fields.push("name = ?")
        values.push(name)
      }
      if (price) {
        fields.push("price = ?")
        values.push(price)
      }

      // always enforce in stock
      fields.push("availability = ?")
      values.push("in stock")

      if (req.files["thumbnail"] && req.files["thumbnail"][0]) {
        fields.push("thumbnail = ?")
        values.push(`/uploads/${req.files["thumbnail"][0].filename}`)
      }

      if (req.files["images"] && req.files["images"].length > 0) {
        const images = req.files["images"].map((f) => `/uploads/${f.filename}`)
        fields.push("images = ?")
        values.push(JSON.stringify(images))
      }

      if (fields.length === 0) {
        return res.status(400).json({ error: "No fields to update" })
      }

      values.push(id)
      const sql = `UPDATE products SET ${fields.join(", ")} WHERE id = ?`
      await db.execute(sql, values)

      res.json({ message: "Product updated successfully" })
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: err.message })
    }
  }
)

// Protected — Delete product
app.delete("/api/products/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params
    await db.execute("DELETE FROM products WHERE id = ?", [id])
    res.json({ message: "Product deleted successfully" })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ============================
// ===== START SERVER ========
app.listen(5000, () => console.log("✅ Server running on port 5000"))
