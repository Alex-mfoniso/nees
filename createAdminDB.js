import initSqlJs from "sql.js";
import fs from "fs";
import bcrypt from "bcryptjs";

const SQL = await initSqlJs();
const db = new SQL.Database();

db.run(`
  CREATE TABLE admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
  );
`);

const hashed = bcrypt.hashSync("1234", 10); // replace "yourpassword"
db.run("INSERT INTO admins (username, password) VALUES (?, ?);", ["prosper", hashed]); // replace "yourusername"

fs.writeFileSync("./database.sqlite", Buffer.from(db.export()));
console.log("Database created with one admin!");
