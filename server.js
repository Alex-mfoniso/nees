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
import { fileURLToPath } from 'url'

dotenv.config()

// --- Initialization ---
const app = express()
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey'

// ==========================
// MONGODB CONNECTION
// ==========================
const MONGODB_URI = process.env.MONGODB_URI
if (!MONGODB_URI) {
  console.error('FATAL: MONGODB_URI is not set')
  process.exit(1)
}

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch((err) => {
    console.error('MongoDB connection error:', err)
    process.exit(1)
  })

// ==========================
// SCHEMAS
// ==========================
const adminSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true }
  },
  { timestamps: true }
)

const productSchema = new mongoose.Schema(
  {
    name: String,
    type: String,
    description: String,
    price: Number,
    category: String,
    tags: [String],
    exchangeable: Boolean,
    refundable: Boolean,
    thumbnail: String,
    images: [String],
    availability: String,
    quantity: Number
  },
  { timestamps: true }
)

const Admin = mongoose.model('Admin', adminSchema)
const Product = mongoose.model('Product', productSchema)

const serializeProduct = (productDoc) => {
  const product =
    typeof productDoc.toObject === 'function' ? productDoc.toObject() : productDoc

  return {
    ...product,
    id: product._id?.toString?.() || product.id
  }
}

// ==========================
// CLOUDINARY
// ==========================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
})

const dataUri = new DataUri()

const formatFile = (file) =>
  dataUri.format(path.extname(file.originalname).toString(), file.buffer)
    .content

const uploadToCloudinary = async (file) => {
  const fileUri = formatFile(file)
  return cloudinary.uploader.upload(fileUri, { folder: 'nees_products' })
}

const parseOptionalBoolean = (value) => {
  if (value === undefined) return undefined
  if (typeof value === 'boolean') return value
  const normalized = String(value).trim().toLowerCase()
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false
  return undefined
}

// ==========================
// MIDDLEWARE
// ==========================
app.use(bodyParser.json())
app.use(cors({ origin: '*' }))
app.use(express.static('public'))

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ==========================
// AUTH
// ==========================
const authenticate = (req, res, next) => {
  const header = req.headers.authorization
  if (!header) return res.status(401).json({ error: 'Missing token' })

  const token = header.split(' ')[1]

  try {
    req.admin = jwt.verify(token, JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
}

// ==========================
// ROOT
// ==========================
app.get('/', (req, res) => {
  res.send('API running')
})

// ==========================
// ADMIN ROUTES
// ==========================
app.post('/api/admin/register', async (req, res) => {
  const { username, password } = req.body

  const hashed = bcrypt.hashSync(password, 10)

  try {
    const admin = await Admin.create({
      username: username.trim(),
      password: hashed
    })

    res.status(201).json({ id: admin._id })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body

  const admin = await Admin.findOne({ username: username.trim() })
  if (!admin) return res.status(400).json({ error: 'Invalid credentials' })

  const valid = bcrypt.compareSync(password, admin.password)
  if (!valid) return res.status(400).json({ error: 'Invalid credentials' })

  const token = jwt.sign(
    { id: admin._id, username: admin.username },
    JWT_SECRET,
    { expiresIn: '2h' }
  )

  res.json({ token })
})

// ==========================
// PRODUCTS
// ==========================
const upload = multer({ storage: multer.memoryStorage() })

app.post(
  '/api/products',
  authenticate,
  upload.fields([
    { name: 'images', maxCount: 5 },
    { name: 'thumbnailImage', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const { productName, price, category, description, type, exchangeable, refundable } = req.body
      const parsedPrice = Number(price)

      if (!productName || Number.isNaN(parsedPrice) || !category) {
        return res.status(400).json({ error: 'Missing fields' })
      }

      let images = []
      let thumbnail = ''

      if (req.files['images']) {
        const results = await Promise.all(
          req.files['images'].map(uploadToCloudinary)
        )
        images = results.map((r) => r.secure_url)
      }

      if (req.files['thumbnailImage']) {
        const result = await uploadToCloudinary(req.files['thumbnailImage'][0])
        thumbnail = result.secure_url
      }

      const product = await Product.create({
        name: productName,
        price: parsedPrice,
        category,
        description: description || '',
        type: type || 'Simple',
        exchangeable: parseOptionalBoolean(exchangeable) ?? false,
        refundable: parseOptionalBoolean(refundable) ?? false,
        images,
        thumbnail,
        availability: 'in stock'
      })

      res.status(201).json(serializeProduct(product))
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  }
)

app.get('/api/products', async (req, res) => {
  const products = await Product.find().sort({ createdAt: -1 })
  res.json(products.map(serializeProduct))
})

app.get('/api/products/:id', async (req, res) => {
  const product = await Product.findById(req.params.id)
  if (!product) return res.status(404).json({ error: 'Not found' })
  res.json(serializeProduct(product))
})

app.put(
  '/api/products/:id',
  authenticate,
  upload.fields([
    { name: 'images', maxCount: 5 },
    { name: 'thumbnailImage', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const product = await Product.findById(req.params.id)
      if (!product) return res.status(404).json({ error: 'Not found' })

      const {
        productName,
        name,
        price,
        category,
        description,
        quantity,
        availability,
        type
      } = req.body
      const nextName = productName ?? name
      const nextPrice = Number(price)

      if (!nextName || Number.isNaN(nextPrice) || !category) {
        return res.status(400).json({ error: 'Missing fields' })
      }

      product.name = nextName
      product.price = nextPrice
      product.category = category
      if (description !== undefined) product.description = description
      if (quantity !== undefined) product.quantity = Number(quantity)
      if (availability !== undefined) product.availability = availability
      if (type !== undefined) product.type = type
      const parsedExchangeable = parseOptionalBoolean(req.body.exchangeable)
      const parsedRefundable = parseOptionalBoolean(req.body.refundable)
      if (parsedExchangeable !== undefined) product.exchangeable = parsedExchangeable
      if (parsedRefundable !== undefined) product.refundable = parsedRefundable

      if (req.files?.images?.length) {
        const imageUploads = await Promise.all(req.files.images.map(uploadToCloudinary))
        product.images = imageUploads.map((r) => r.secure_url)
      }

      const thumbnailFile =
        req.files?.thumbnailImage?.[0] || req.files?.thumbnail?.[0]

      if (thumbnailFile) {
        const thumbUpload = await uploadToCloudinary(thumbnailFile)
        product.thumbnail = thumbUpload.secure_url
      }

      await product.save()
      res.json(serializeProduct(product))
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  }
)

app.delete('/api/products/:id', authenticate, async (req, res) => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id)
    if (!deleted) return res.status(404).json({ error: 'Not found' })
    res.json({ success: true, id: req.params.id })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ==========================
// SPA ROUTING FIX (IMPORTANT)
// ==========================

// Serve React build
app.use(express.static(path.join(__dirname, '..', 'dist')))

// SAFE fallback (FIXED)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'))
})

// ==========================
// EXPORT FOR VERCEL
// ==========================
export default app

// LOCAL ONLY
const PORT = process.env.PORT || 5000
app.listen(PORT, '0.0.0.0', () =>
  console.log(`Server running on port ${PORT}`)
)
