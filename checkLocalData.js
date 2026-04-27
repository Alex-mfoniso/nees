import fs from "fs";
import initSqlJs from "sql.js";

const DB_FILE = "./database.sqlite";

async function checkLocalData() {
    console.log("Checking local SQLite database...");

    if (!fs.existsSync(DB_FILE)) {
        console.log("❌ database.sqlite not found");
        return;
    }

    const SQL = await initSqlJs();
    const fileBuffer = fs.readFileSync(DB_FILE);
    const db = new SQL.Database(fileBuffer);

    // Check admins
    const adminResult = db.exec("SELECT COUNT(*) as count FROM admins");
    const adminCount = adminResult[0]?.values[0][0] || 0;
    console.log(`Admins: ${adminCount}`);

    // Check products
    const productResult = db.exec("SELECT COUNT(*) as count FROM products");
    const productCount = productResult[0]?.values[0][0] || 0;
    console.log(`Products: ${productCount}`);

    if (productCount > 0) {
        console.log("\n📦 Product details:");
        const products = db.exec("SELECT id, name, price, category, thumbnail, images FROM products");
        if (products.length > 0) {
            const columns = products[0].columns;
            const rows = products[0].values;
            rows.forEach(row => {
                const obj = {};
                columns.forEach((col, i) => obj[col] = row[i]);
                console.log(`- ID: ${obj.id}, Name: ${obj.name}, Price: ${obj.price}, Category: ${obj.category}`);
                console.log(`  Thumbnail: ${obj.thumbnail}`);
                console.log(`  Images: ${obj.images}`);
            });
        }
    }

    db.close();
}

checkLocalData().catch(err => console.error("Error:", err));