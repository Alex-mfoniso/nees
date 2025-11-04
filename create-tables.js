import fs from "fs";
import path from "path";
import initSqlJs from "sql.js";

const DB_FILE = "./database.sqlite";

async function createTables() {
  console.log("Initializing SQL.js...");

  const SQL = await initSqlJs({
    locateFile: (file) =>
      path.join(process.cwd(), "node_modules/sql.js/dist/", file),
  });

  let db;

  // Load or create DB
  if (fs.existsSync(DB_FILE)) {
    console.log("Loading existing database...");
    const fileBuffer = fs.readFileSync(DB_FILE);
    db = new SQL.Database(fileBuffer);
  } else {
    console.log("Creating new database...");
    db = new SQL.Database();
  }

  // Create tables
  console.log("Creating tables if not existing...");

  db.run(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
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

  // Save the updated DB
  console.log("Saving database...");
  fs.writeFileSync(DB_FILE, Buffer.from(db.export()));

  console.log("✅ Tables created successfully.");
}

createTables().catch((err) => console.error("Error:", err));
