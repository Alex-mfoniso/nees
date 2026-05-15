import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'

dotenv.config()

// Admin schema (same as server.js)
const adminSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true }
  },
  { timestamps: true }
)

const Admin = mongoose.model('Admin', adminSchema)

async function resetAdminPassword() {
  const MONGODB_URI = process.env.MONGODB_URI
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not set')
    process.exit(1)
  }

  await mongoose.connect(MONGODB_URI)
  console.log('✅ Connected to MongoDB')

  const newPassword = 'admin123' // You can change this to any password you want
  const hashedPassword = await bcrypt.hash(newPassword, 10)

  const result = await Admin.updateOne(
    { username: 'prosper' },
    { password: hashedPassword }
  )

  if (result.modifiedCount > 0) {
    console.log(`✅ Password reset successfully!`)
    console.log(`Username: prosper`)
    console.log(`New Password: ${newPassword}`)
  } else {
    console.log('❌ Admin not found or password not updated')
  }

  await mongoose.disconnect()
}

resetAdminPassword().catch((err) => {
  console.error('❌ Error:', err)
  process.exit(1)
})


