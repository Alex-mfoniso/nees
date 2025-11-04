import initSqlJs from "sql.js";
import fs from "fs";

const SQL = await initSqlJs();
const fileBuffer = fs.readFileSync("./database.sqlite");
const db = new SQL.Database(fileBuffer);

const username = "prosper";  // your admin username
const password = "1234"; // plain password

const stmt = db.prepare("SELECT * FROM admins WHERE username = ?;");
stmt.bind([username]);

let admin = null;
if (stmt.step()) admin = stmt.getAsObject();
stmt.free();

if (!admin) console.log("User not found");
else console.log("User found", admin);
