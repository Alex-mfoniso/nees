import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

// Product schema
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

async function createProducts() {
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
        console.error("❌ MONGODB_URI not set");
        process.exit(1);
    }

    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    const imageUrls = [
        "https://res.cloudinary.com/dnartpsxj/image/upload/v1777254760/nees_products/rhykxiwhw5jesvrr9ihx.jpg",
        "https://res.cloudinary.com/dnartpsxj/image/upload/v1777254762/nees_products/a4ojfejwu4vmsepv5sfg.jpg",
        "https://res.cloudinary.com/dnartpsxj/image/upload/v1777254764/nees_products/hknkrsr5wnvwpr2xtgem.jpg",
        "https://res.cloudinary.com/dnartpsxj/image/upload/v1777254765/nees_products/b3skywwdkuqwor0shckv.jpg",
        "https://res.cloudinary.com/dnartpsxj/image/upload/v1777254766/nees_products/tpsijrkbqcqnjwzzxm7m.jpg",
        "https://res.cloudinary.com/dnartpsxj/image/upload/v1777254767/nees_products/ze38aq4kwhn5xexiqgqq.jpg",
        "https://res.cloudinary.com/dnartpsxj/image/upload/v1777254768/nees_products/iubow2xguwvqccvt5sdz.jpg",
        "https://res.cloudinary.com/dnartpsxj/image/upload/v1777254770/nees_products/j9yfdqsz4ez89flxflkq.jpg",
        "https://res.cloudinary.com/dnartpsxj/image/upload/v1777254771/nees_products/wzhqrfdlldcdxazaxt63.jpg",
        "https://res.cloudinary.com/dnartpsxj/image/upload/v1777254772/nees_products/g2kewgcwcjxg1rmrjfrb.png",
        "https://res.cloudinary.com/dnartpsxj/image/upload/v1777254774/nees_products/f85ylybhu4ljaluc9ioq.png",
        "https://res.cloudinary.com/dnartpsxj/image/upload/v1777254775/nees_products/nptemj2wqbxifzi2edpw.png",
        "https://res.cloudinary.com/dnartpsxj/image/upload/v1777254776/nees_products/t5ib1vagysipnp4v4kns.png",
        "https://res.cloudinary.com/dnartpsxj/image/upload/v1777254778/nees_products/g9zgjta8r5hqdrxe6jri.png",
        "https://res.cloudinary.com/dnartpsxj/image/upload/v1777254779/nees_products/sagsowcuvono8wi9idz9.png",
        "https://res.cloudinary.com/dnartpsxj/image/upload/v1777254781/nees_products/vynmxnkwrhoo40w3jjda.png",
        "https://res.cloudinary.com/dnartpsxj/image/upload/v1777254782/nees_products/jryukd0la2mb3mlbfg7i.png",
        "https://res.cloudinary.com/dnartpsxj/image/upload/v1777254784/nees_products/bdaaasgz8oxaxcszul4e.png"
    ];

    // First, delete existing products to recreate
    await Product.deleteMany({});
    console.log("🗑️ Deleted existing products");

    // Create one product per image
    for (let i = 0; i < imageUrls.length; i++) {
        const product = await Product.create({
            name: `Product ${i + 1}`,
            price: (i + 1) * 10, // Placeholder prices
            category: "General",
            thumbnail: imageUrls[i],
            images: [imageUrls[i]]
        });
        console.log(`✅ Created product: ${product.name} (ID: ${product._id})`);
    }

    console.log("🎉 All products created successfully!");
    await mongoose.disconnect();
}

createProducts().catch(err => {
    console.error("❌ Error:", err);
    process.exit(1);
});