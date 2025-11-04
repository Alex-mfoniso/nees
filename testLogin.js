import initSqlJs from "sql.js";
import fs from "fs";
import bcrypt from "bcryptjs";
import path from "path";

const SQL = await initSqlJs({ locateFile: file => path.join("node_modules/sql.js/dist/", file) });
const DB_FILE = "./database.sqlite";

const fileBuffer = fs.readFileSync(DB_FILE);
const db = new SQL.Database(fileBuffer);

const username = "prosper"; // replace with your username
const password = "1234"; // replace with the password you used

const stmt = db.prepare("SELECT * FROM admins WHERE username = ?;");
stmt.bind([username]);

let admin = null;
if (stmt.step()) admin = stmt.getAsObject();
stmt.free();

if (!admin || !admin.password) {
  console.log("Invalid credentials");
} else if (bcrypt.compareSync(password, admin.password)) {
  console.log("Login successful!");
} else {
  console.log("Invalid credentials");
}
