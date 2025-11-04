// import fs from "fs";
// import initSqlJs from "sql.js";
// import path from "path";

// const SQL = await initSqlJs({
//   locateFile: file => path.join(process.cwd(), "node_modules/sql.js/dist/", file)
// });

// const DB_FILE = "./database.sqlite";

// if (!fs.existsSync(DB_FILE)) {
//   console.log("Database file not found!");
//   process.exit(1);
// }

// const fileBuffer = fs.readFileSync(DB_FILE);
// const db = new SQL.Database(fileBuffer);

// const stmt = db.prepare("SELECT * FROM admins;");
// while (stmt.step()) {
//   const admin = stmt.getAsObject();
//   console.log(admin);
// }
// stmt.free();


import initSqlJs from "sql.js";
import fs from "fs";
import path from "path";

const SQL = await initSqlJs({ locateFile: file => path.join("node_modules/sql.js/dist/", file) });

const DB_FILE = "./database.sqlite";

if (!fs.existsSync(DB_FILE)) {
  console.log("Database file not found!");
  process.exit(1);
}

const fileBuffer = fs.readFileSync(DB_FILE);
const db = new SQL.Database(fileBuffer);

const stmt = db.prepare("SELECT * FROM admins;");
while (stmt.step()) console.log(stmt.getAsObject());
stmt.free();
