import path from 'path'
import express from 'express'
import bodyParser from 'body-parser'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import cors from 'cors'
import multer from 'multer'
import mongoose from 'mongoose'
import { v2 as cloudinary } from 'cloudinary'
import DataUri from 'datauri/parser.js'
import dotenv from 'dotenv'

dotenv.config()

// --- Initialization ---
const app = express()
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey'

// ==========================
// MONGODB CONNECTION
// ==========================
const MONGODB_URI = process.env.MONGODB_URI
if (!MONGODB_URI) {
  console.error('❌ FATAL: MONGODB_URI environment variable is not set.')
  process.exit(1)
}

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err)
    process.exit(1)
  })

// ==========================
// MONGOOSE SCHEMAS & MODELS
// ==========================

// Admin Schema
const adminSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true }
  },
  { timestamps: true }
)

const Admin = mongoose.model('Admin', adminSchema)

// Product Schema
const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    type: { type: String, default: 'general' },
    description: { type: String, default: '' },
    price: { type: Number, required: true },
    category: { type: String, required: true },
    tags: { type: [String], default: [] },
    exchangeable: { type: Boolean, default: false },
    refundable: { type: Boolean, default: false },
    thumbnail: { type: String, default: '' }, // Cloudinary URL
    images: { type: [String], default: [] }, // Array of Cloudinary URLs
    availability: { type: String, default: 'in stock' },
    quantity: { type: Number, default: 0 }
  },
  { timestamps: true }
)

const Product = mongoose.model('Product', productSchema)

// ==========================
// CLOUDINARY CONFIGURATION
// ==========================
if (
  !process.env.CLOUDINARY_CLOUD_NAME ||
  !process.env.CLOUDINARY_API_KEY ||
  !process.env.CLOUDINARY_API_SECRET
) {
  console.warn(
    '⚠️ Cloudinary environment variables are missing. File uploads will fail.'
  )
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
})

const dataUri = new DataUri()

// Helper: format multer file buffer for Cloudinary
const formatFile = (file) =>
  dataUri.format(path.extname(file.originalname).toString(), file.buffer)
    .content

// Helper: upload a single file to Cloudinary
const uploadToCloudinary = async (file) => {
  const fileUri = formatFile(file)
  return cloudinary.uploader.upload(fileUri, { folder: 'nees_products' })
}

// ==========================
// MULTER CONFIG (Memory Storage)
// ==========================
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB per file
})

// ==========================
// MIDDLEWARE
// ==========================
app.use(bodyParser.json())
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  })
)
app.use(express.static('public'))

// ==========================
// AUTH MIDDLEWARE
// ==========================
const authenticate = (req, res, next) => {
  const header = req.headers.authorization
  if (!header) return res.status(401).json({ error: 'Missing token' })

  const token = header.split(' ')[1]
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.admin = decoded
    next()
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
}

// ==========================
// ROOT
// ==========================
app.get('/', (req, res) => res.send('✅ API alive with MongoDB + Cloudinary'))

// ==========================
// ADMIN ROUTES
// ==========================

// REGISTER
app.post('/api/admin/register', async (req, res) => {
  const { username, password } = req.body
  if (!username || !password)
    return res.status(400).json({ error: 'Username and password required' })

  const hashed = bcrypt.hashSync(password, 10)

  try {
    const admin = await Admin.create({
      username: username.trim(),
      password: hashed
    })
    res.status(201).json({ message: 'Admin created', id: admin._id })
  } catch (err) {
    if (err.code === 11000) {
      // MongoDB duplicate key error
      res.status(400).json({ error: 'Username already exists' })
    } else {
      console.error('Admin registration error:', err)
      res.status(500).json({ error: err.message })
    }
  }
})

// LOGIN
app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body
  if (!username || !password)
    return res.status(400).json({ error: 'Username and password required' })

  try {
    const admin = await Admin.findOne({ username: username.trim() })

    if (!admin) return res.status(400).json({ error: 'Invalid credentials' })

    const isValid = bcrypt.compareSync(password.trim(), admin.password)
    if (!isValid) return res.status(400).json({ error: 'Invalid credentials' })

    const token = jwt.sign(
      { id: admin._id, username: admin.username },
      JWT_SECRET,
      { expiresIn: '2h' }
    )

    res.json({ token })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ error: err.message })
  }
})

// ==========================
// PRODUCTS ROUTES
// ==========================

// POST — Create new product
app.post(
  '/api/products',
  authenticate,
  upload.fields([
    { name: 'images', maxCount: 5 },
    { name: 'thumbnailImage', maxCount: 1 }
  ]),
  async (req, res) => {
    const {
      productName,
      type,
      description,
      price,
      category,
      imageUrls,
      thumbnailUrl
    } = req.body

    if (!productName || !price || !category)
      return res
        .status(400)
        .json({ error: 'Product Name, price and category required' })

    const uploadedImages = req.files['images'] || []
    const thumbnailFile = req.files['thumbnailImage']?.[0]

    let thumbnailURL = thumbnailUrl || ''
    let imageURLs = imageUrls ? JSON.parse(imageUrls) : []

    try {
      // 1. Upload thumbnail to Cloudinary if file provided
      if (thumbnailFile) {
        const result = await uploadToCloudinary(thumbnailFile)
        thumbnailURL = result.secure_url
      }

      // 2. Upload product images concurrently if files provided
      if (uploadedImages.length > 0) {
        const results = await Promise.all(
          uploadedImages.map(uploadToCloudinary)
        )
        imageURLs = imageURLs.concat(results.map((r) => r.secure_url))
      }

      // 3. Fallback: use first image as thumbnail
      if (!thumbnailURL && imageURLs.length > 0) {
        thumbnailURL = imageURLs[0]
      }

      const parsedPrice = parseFloat(price)
      if (isNaN(parsedPrice))
        return res.status(400).json({ error: 'Price must be a valid number.' })

      const product = await Product.create({
        name: productName,
        type: type || 'general',
        description: description || '',
        price: parsedPrice,
        category,
        tags: [],
        exchangeable: req.body.exchangeable === '1',
        refundable: req.body.refundable === '1',
        thumbnail: thumbnailURL,
        images: imageURLs,
        availability: 'in stock'
      })

      res
        .status(201)
        .json({ message: 'Product created successfully', id: product._id })
    } catch (err) {
      console.error('Product POST Error:', err)
      res
        .status(500)
        .json({ error: 'Failed to create product: ' + err.message })
    }
  }
)

// GET — All products
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 })

    const formatted = products.map((p) => ({
      id: p._id,
      name: p.name || 'Unnamed Product',
      category: p.category || 'Uncategorized',
      quantity: p.quantity ?? 0,
      availability: p.availability || 'In Stock',
      images: p.images || [],
      price: p.price || 0,
      thumbnail: p.thumbnail || '',
      type: p.type,
      description: p.description,
      exchangeable: p.exchangeable,
      refundable: p.refundable,
      tags: p.tags
    }))

    res.json(formatted)
  } catch (err) {
    console.error('Error fetching products:', err)
    res.status(500).json({ error: 'Failed to fetch products' })
  }
})

// GET — Single product by ID
app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
    if (!product) return res.status(404).json({ error: 'Product not found' })
    res.json(product)
  } catch (err) {
    console.error('Error fetching product:', err)
    res.status(500).json({ error: err.message })
  }
})

// PUT — Update product
app.put(
  '/api/products/:id',
  authenticate,
  upload.fields([
    { name: 'images', maxCount: 5 },
    { name: 'thumbnail', maxCount: 1 }
  ]),
  async (req, res) => {
    const { id } = req.params
    const {
      name,
      type,
      description,
      price,
      category,
      tags,
      exchangeable,
      refundable,
      existingImages, // JSON string array of existing Cloudinary URLs to keep
      quantity,
      availability
    } = req.body

    const uploadedImages = req.files['images'] || []
    const thumbnailFile = req.files['thumbnail']?.[0]

    try {
      const updateData = {}

      // --- Handle new file uploads ---
      if (thumbnailFile) {
        const result = await uploadToCloudinary(thumbnailFile)
        updateData.thumbnail = result.secure_url
      }

      if (uploadedImages.length > 0) {
        const results = await Promise.all(
          uploadedImages.map(uploadToCloudinary)
        )
        const newURLs = results.map((r) => r.secure_url)
        const existing = existingImages ? JSON.parse(existingImages) : []
        updateData.images = [...existing, ...newURLs]
      }

      // --- Handle text fields ---
      if (name) updateData.name = name
      if (type) updateData.type = type
      if (description !== undefined) updateData.description = description
      if (price) updateData.price = parseFloat(price)
      if (category) updateData.category = category
      if (tags) updateData.tags = Array.isArray(tags) ? tags : [tags]
      if (exchangeable !== undefined)
        updateData.exchangeable = exchangeable === '1' || exchangeable === true
      if (refundable !== undefined)
        updateData.refundable = refundable === '1' || refundable === true
      if (quantity !== undefined) updateData.quantity = parseInt(quantity)
      if (availability) updateData.availability = availability

      if (Object.keys(updateData).length === 0)
        return res.status(400).json({ error: 'No fields to update' })

      const updated = await Product.findByIdAndUpdate(id, updateData, {
        new: true
      })
      if (!updated) return res.status(404).json({ error: 'Product not found' })

      res.json({ message: 'Product updated successfully', product: updated })
    } catch (err) {
      console.error('Product PUT Error:', err)
      res.status(500).json({ error: 'Update failed: ' + err.message })
    }
  }
)

// DELETE — Remove product
app.delete('/api/products/:id', authenticate, async (req, res) => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id)
    if (!deleted) return res.status(404).json({ error: 'Product not found' })
    // TODO: Optionally delete associated images from Cloudinary here
    res.json({ message: 'Product deleted' })
  } catch (err) {
    console.error('Product DELETE Error:', err)
    res.status(500).json({ error: err.message })
  }
})

// ==========================
// DEBUG ROUTES
// ==========================
app.get('/debug/product-count', async (req, res) => {
  try {
    const count = await Product.countDocuments()
    res.json({
      status: 'OK',
      productCount: count,
      message: 'Data from MongoDB Atlas.'
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/debug/admins', async (req, res) => {
  try {
    const admins = await Admin.find({}, 'username _id')
    res.json(admins)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})
// ==========================
// STATIC ASSETS & SPA ROUTING
// ==========================
import { fileURLToPath } from 'url'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Serve frontend static files
app.use(express.static(path.join(__dirname, '..', 'dist')))

// Catch-all route for SPA (React/Vite)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'))
})

// ==========================
// VERCEL & LOCAL STARTUP
// ==========================

// 1. Export the app for Vercel's serverless engine
export default app; 

// 2. Only run app.listen locally
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000
  app.listen(PORT, () => console.log(`✅ Server running locally on port ${PORT}`))
}